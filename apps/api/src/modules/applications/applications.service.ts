/** @format */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvaluationQueueProducer } from '../../common/queues/evaluation-queue.producer';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/applications.dto';
import type { Prisma } from '../../generated/prisma/client';

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
        status: true,
        created_at: true,
      },
    });

    if (!application?.status) {
      return {
        alreadyApplied: false,
      };
    }

    return {
      alreadyApplied: true,
      statusTechnicalName: application.status,
      appliedAt: application.created_at?.toISOString() ?? null,
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

    return updated;
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
  async findSimilarJobs(applicationId: number) {
    await this.findOne(applicationId);
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
}
