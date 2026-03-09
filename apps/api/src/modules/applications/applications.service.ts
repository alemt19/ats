/** @format */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    await this.findOne(id);
    return this.prisma.applications.update({
      where: { id },
      data: dto,
    });
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
      title: app.jobs?.title ?? '',
      category: app.jobs?.job_categories?.name ?? '',
      city: app.jobs?.city ?? '',
      state: app.jobs?.state ?? '',
      position: app.jobs?.position ?? '',
      salary: Number(app.jobs?.salary ?? 0),
      status: app.status ?? 'applied',
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
          },
        },
      },
    });
  }
}
