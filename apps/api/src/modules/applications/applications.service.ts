/** @format */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvaluationQueueProducer } from '../../common/queues/evaluation-queue.producer';
import { CreateApplicationDto, UpdateApplicationDto, CreateApplicationFeedbackDto } from './dto/applications.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluationQueue: EvaluationQueueProducer,
  ) {}

  private normalizeApplicationStatus(status: unknown): string | null {
    const normalized = typeof status === 'string' ? status.trim() : '';
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeAiFeedbackSections(value: unknown): Record<string, string> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .map(([title, content]) => {
        const normalizedTitle = String(title).trim();
        const normalizedContent = typeof content === 'string' ? content.trim() : '';

        if (!normalizedTitle || !normalizedContent) {
          return null;
        }

        return [normalizedTitle, normalizedContent] as const;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry));

    if (normalizedEntries.length === 0) {
      return null;
    }

    return Object.fromEntries(normalizedEntries);
  }

  private async createApplicationStatusRegister(applicationId: number, status: string) {
    await this.prisma.$executeRaw`
      INSERT INTO "applications_registers" ("application_id", "status")
      VALUES (${applicationId}, ${status})
    `;
  }

  private async getAdminUser(userId: string) {
    const admin = await this.prisma.user_admin.findFirst({
      where: { user_id: userId },
      select: {
        id: true,
        company_id: true,
        name: true,
        lastname: true,
        profile_picture: true,
      },
    });

    if (!admin || !admin.company_id) {
      throw new ForbiddenException('Administrador no autorizado');
    }

    return admin;
  }

  private async getAdminScopedApplication(userId: string, applicationId: number) {
    const admin = await this.getAdminUser(userId);

    const application = await this.prisma.applications.findFirst({
      where: {
        id: applicationId,
        jobs: { company_id: admin.company_id },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    return { admin, application };
  }

  private mapApplicationNote(note: {
    id: number;
    recruiter_id: number | null;
    text: string;
    created_at: Date | null;
    user_admin: {
      name: string | null;
      lastname: string | null;
      profile_picture: string | null;
    } | null;
  }) {
    const recruiterName = [note.user_admin?.name, note.user_admin?.lastname]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(' ')
      .trim();

    return {
      id: note.id,
      recruiter_id: note.recruiter_id,
      recruiter_name: recruiterName || 'Administrador',
      recruiter_avatar_url: note.user_admin?.profile_picture ?? undefined,
      text: note.text,
      created_at: note.created_at?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Create a new application and enqueue evaluation
   */
  async create(dto: CreateApplicationDto) {
    let application;
    try {
      application = await this.prisma.applications.create({
        data: {
          ...dto,
          evaluation_status: 'pending',
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe una postulaci\u00f3n para este trabajo y candidato');
      }
      throw error;
    }

    if (application.candidate_id && application.job_id) {
      await this.evaluationQueue.enqueueEvaluation({
        applicationId: application.id,
        candidateId: application.candidate_id,
        jobId: application.job_id,
      });
    }

    const createdStatus = this.normalizeApplicationStatus(application.status) ?? 'applied';
    await this.createApplicationStatusRegister(application.id, createdStatus);

    return application;
  }

  /**
   * Retrieve multiple applications with pagination and optional filters.
   * Results are ordered by overall_score descending.
   */
  async findAll(skip?: number, take?: number, jobId?: number, candidateId?: number) {
    const where: Prisma.applicationsWhereInput = {};
    if (jobId) where.job_id = jobId;
    if (candidateId) where.candidate_id = candidateId;

    return this.prisma.applications.findMany({
      skip,
      take,
      where,
      orderBy: { overall_score: 'desc' },
    });
  }

  async findMyApplicationByJob(userId: string, jobId: number) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!candidate) {
      return {
        alreadyApplied: false,
      };
    }

    const application = await this.prisma.applications.findFirst({
      where: {
        candidate_id: candidate.id,
        job_id: jobId,
      },
      select: {
        id: true,
        status: true,
        evaluation_status: true,
        created_at: true,
        updated_at: true,
        overall_score: true,
        match_technical_score: true,
        match_soft_score: true,
        match_culture_score: true,
        ai_feedback: true,
      },
    });

    if (!application?.status) {
      return {
        alreadyApplied: false,
      };
    }

    const aiFeedback = this.normalizeAiFeedbackSections(application.ai_feedback);

    return {
      alreadyApplied: true,
      applicationId: application.id,
      statusTechnicalName: application.status,
      evaluationStatus: application.evaluation_status ?? null,
      appliedAt: application.created_at?.toISOString() ?? null,
      evaluationUpdatedAt: application.updated_at?.toISOString() ?? null,
      scores: {
        technical: application.match_technical_score ?? null,
        soft: application.match_soft_score ?? null,
        culture: application.match_culture_score ?? null,
        overall: application.overall_score ?? null,
      },
      aiFeedback,
    };
  }

  async refreshMyApplicationByJob(userId: string, jobId: number) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const application = await this.prisma.applications.findFirst({
      where: {
        candidate_id: candidate.id,
        job_id: jobId,
      },
      select: {
        id: true,
        status: true,
        candidate_id: true,
        job_id: true,
      },
    });

    if (!application) {
      throw new NotFoundException('No existe una postulación para esta oferta');
    }

    await this.prisma.$transaction([
      this.prisma.application_similar_jobs.deleteMany({
        where: { application_id: application.id },
      }),
      this.prisma.applications.update({
        where: { id: application.id },
        data: {
          match_technical_score: null,
          match_soft_score: null,
          match_culture_score: null,
          overall_score: null,
          ai_feedback: Prisma.JsonNull,
          evaluation_status: 'pending',
          updated_at: new Date(),
        },
      }),
    ]);

    if (application.candidate_id && application.job_id) {
      await this.evaluationQueue.enqueueEvaluation({
        applicationId: application.id,
        candidateId: application.candidate_id,
        jobId: application.job_id,
      });
    }

    return {
      ok: true,
      applicationId: application.id,
      status: application.status,
      evaluationStatus: 'pending',
    };
  }

  /**
   * Retrieve a single application by id
   */
  async findOne(id: number) {
    const application = await this.prisma.applications.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  /**
   * Update an existing application by id
   */
  async update(id: number, dto: UpdateApplicationDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.applications.update({
      where: { id },
      data: dto,
    });

    const previousStatus = this.normalizeApplicationStatus(existing.status);
    const nextStatus = this.normalizeApplicationStatus(updated.status);

    if (nextStatus && nextStatus !== previousStatus) {
      await this.createApplicationStatusRegister(updated.id, nextStatus);
    }

    return updated;
  }

  async updateStatusForAdmin(userId: string, applicationId: number, status: string) {
    const cleanStatus = String(status).trim();

    if (!cleanStatus) {
      throw new BadRequestException('El estado es requerido');
    }

    const { application } = await this.getAdminScopedApplication(userId, applicationId);
    const previousStatus = this.normalizeApplicationStatus(application.status);

    if (previousStatus === cleanStatus) {
      return {
        id: applicationId,
        status: cleanStatus,
      };
    }

    const updated = await this.prisma.applications.update({
      where: { id: applicationId },
      data: { status: cleanStatus },
      select: {
        id: true,
        status: true,
      },
    });

    await this.createApplicationStatusRegister(updated.id, cleanStatus);

    if (cleanStatus === 'hired') {
      await this.createHiredNotification(applicationId);
    }

    return updated;
  }

  private async createHiredNotification(applicationId: number) {
    const application = await this.prisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        candidates: { select: { user_id: true } },
        jobs: { select: { id: true, title: true } },
      },
    });

    const candidateUserId = application?.candidates?.user_id;
    if (!candidateUserId) return;

    const jobTitle = application.jobs?.title?.trim() || 'la oferta';

    await this.prisma.notifications.create({
      data: {
        user_id: candidateUserId,
        type: 'application_hired',
        entity_type: 'application',
        entity_id: applicationId,
        title: '¡Felicitaciones! Fuiste contratado',
        message: `Tu postulacion a ${jobTitle} ha sido aceptada. ¡Bienvenido al equipo!`,
        metadata: {
          job_id: application.jobs?.id ?? null,
          job_title: application.jobs?.title ?? null,
        },
      },
    });
  }

  async findNotesForAdmin(userId: string, applicationId: number) {
    await this.getAdminScopedApplication(userId, applicationId);

    const notes = await this.prisma.notes.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        recruiter_id: true,
        text: true,
        created_at: true,
        user_admin: {
          select: {
            name: true,
            lastname: true,
            profile_picture: true,
          },
        },
      },
    });

    return notes.map((note) => this.mapApplicationNote(note));
  }

  async createNoteForAdmin(userId: string, applicationId: number, text: string) {
    const cleanText = String(text).trim();

    if (!cleanText) {
      throw new BadRequestException('La nota no puede estar vacía');
    }

    const { admin } = await this.getAdminScopedApplication(userId, applicationId);

    const note = await this.prisma.notes.create({
      data: {
        application_id: applicationId,
        recruiter_id: admin.id,
        text: cleanText,
      },
      select: {
        id: true,
        recruiter_id: true,
        text: true,
        created_at: true,
        user_admin: {
          select: {
            name: true,
            lastname: true,
            profile_picture: true,
          },
        },
      },
    });

    return this.mapApplicationNote(note);
  }

  /**
   * Delete an application by id
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.applications.delete({
      where: { id },
    });
  }

  /**
   * List all applications for the currently authenticated candidate with job details
   */
  async findMyApplications(userId: string) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!candidate) {
      return [];
    }

    const applications = await this.prisma.applications.findMany({
      where: { candidate_id: candidate.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        status: true,
        evaluation_status: true,
        created_at: true,
        overall_score: true,
        match_technical_score: true,
        match_soft_score: true,
        match_culture_score: true,
        job_id: true,
        jobs: {
          select: {
            title: true,
            city: true,
            state: true,
            position: true,
            salary: true,
            job_categories: {
              select: { name: true },
            },
          },
        },
      },
    });

    return applications.map((app) => ({
      id: app.id,
      offer_id: app.job_id ?? 0,
      title: app.jobs?.title ?? '',
      category: app.jobs?.job_categories?.name ?? '',
      city: app.jobs?.city ?? '',
      state: app.jobs?.state ?? '',
      position: app.jobs?.position ?? '',
      salary: Number(app.jobs?.salary ?? 0),
      status: app.status ?? 'applied',
      evaluation_status: app.evaluation_status ?? 'pending',
      applied_at: app.created_at?.toISOString() ?? null,
      overall_score: app.overall_score ?? null,
      match_technical_score: app.match_technical_score ?? null,
      match_soft_score: app.match_soft_score ?? null,
      match_culture_score: app.match_culture_score ?? null,
    }));
  }

  /**
   * Retrieve similar jobs analysis for an application
   */
  async findSimilarJobs(userId: string, applicationId: number) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const application = await this.prisma.applications.findFirst({
      where: {
        id: applicationId,
        candidate_id: candidate.id,
      },
      select: {
        id: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    return this.prisma.application_similar_jobs.findMany({
      where: { application_id: applicationId },
      orderBy: { rank: 'asc' },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            company_id: true,
            city: true,
            state: true,
            position: true,
            salary: true,
          },
        },
      },
    });
  }

  async createFeedback(userId: string, applicationId: number, dto: CreateApplicationFeedbackDto, scope: 'admin' | 'candidate') {
    const authorType = scope === 'admin' ? 'employer' : 'candidate';

    if (scope === 'admin') {
      const { application } = await this.getAdminScopedApplication(userId, applicationId);
      if (application.status !== 'hired') {
        throw new BadRequestException('Solo se puede dejar feedback de candidatos contratados');
      }
    } else {
      const candidate = await this.prisma.candidates.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!candidate) {
        throw new NotFoundException('Candidato no encontrado');
      }

      const application = await this.prisma.applications.findFirst({
        where: { id: applicationId, candidate_id: candidate.id },
        select: { id: true },
      });

      if (!application) {
        throw new NotFoundException(`Postulación con ID ${applicationId} no encontrada`);
      }
    }

    const data: Prisma.application_feedbackUncheckedCreateInput = {
      application_id: applicationId,
      author_type: authorType as any,
      overall_rating: dto.overall_rating,
      process_rating: dto.process_rating ?? null,
      comments: dto.comments ?? null,
    };

    if (scope === 'admin' && dto.match_accuracy_rating !== undefined) {
      data.match_accuracy_rating = dto.match_accuracy_rating;
    }

    return this.prisma.application_feedback.upsert({
      where: {
        application_id_author_type: {
          application_id: applicationId,
          author_type: authorType as any,
        },
      },
      create: data,
      update: {
        overall_rating: data.overall_rating,
        process_rating: data.process_rating,
        match_accuracy_rating: data.match_accuracy_rating ?? null,
        comments: data.comments,
      },
      select: {
        id: true,
        author_type: true,
        overall_rating: true,
        process_rating: true,
        match_accuracy_rating: true,
        comments: true,
        created_at: true,
      },
    });
  }

  async getFeedback(applicationId: number) {
    const feedbacks = await this.prisma.application_feedback.findMany({
      where: { application_id: applicationId },
      select: {
        id: true,
        author_type: true,
        overall_rating: true,
        process_rating: true,
        match_accuracy_rating: true,
        comments: true,
        created_at: true,
      },
    });

    const employer = feedbacks.find((f) => f.author_type === 'employer') ?? null;
    const candidate = feedbacks.find((f) => f.author_type === 'candidate') ?? null;

    return { employer, candidate };
  }

  async getFeedbackStats(userId: string) {
    const admin = await this.getAdminUser(userId);

    const stats = await this.prisma.$queryRaw<
      Array<{
        author_type: string;
        avg_overall: number;
        avg_process: number;
        avg_match_accuracy: number;
        count: bigint;
      }>
    >`
      SELECT
        af.author_type,
        ROUND(AVG(af.overall_rating)::numeric, 2)        AS avg_overall,
        ROUND(AVG(af.process_rating)::numeric, 2)        AS avg_process,
        ROUND(AVG(af.match_accuracy_rating)::numeric, 2) AS avg_match_accuracy,
        COUNT(*)                                          AS count
      FROM application_feedback af
      INNER JOIN applications a ON a.id = af.application_id
      INNER JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = ${admin.company_id}
      GROUP BY af.author_type
    `;

    const employer = stats.find((s) => s.author_type === 'employer') ?? null;
    const candidate = stats.find((s) => s.author_type === 'candidate') ?? null;

    return {
      employer: employer
        ? {
            avg_overall: Number(employer.avg_overall),
            avg_process: Number(employer.avg_process),
            avg_match_accuracy: Number(employer.avg_match_accuracy),
            count: Number(employer.count),
          }
        : null,
      candidate: candidate
        ? {
            avg_overall: Number(candidate.avg_overall),
            avg_process: Number(candidate.avg_process),
            count: Number(candidate.count),
          }
        : null,
    };
  }
}
