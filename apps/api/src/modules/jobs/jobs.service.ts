/** @format */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmbeddingsQueueProducer } from '../../common/queues/embeddings-queue.producer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminOfferDto, CreateJobDto, UpdateJobDto } from './dto/jobs.dto';
import type { Prisma } from '../../generated/prisma/client';

type JobAttributeType = 'hard_skill' | 'soft_skill';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsQueueProducer: EmbeddingsQueueProducer,
  ) {}

  private normalizeAttributeNames(values: string[]) {
    const unique = new Set<string>();

    values.forEach((value) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      unique.add(normalized);
    });

    return Array.from(unique);
  }

  private async getCurrentAdmin(userId: string) {
    const admin = await this.prisma.user_admin.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    if (!admin.company_id) {
      throw new BadRequestException('La empresa del admin no esta configurada');
    }

    return admin;
  }

  async createAdminOffer(userId: string, dto: CreateAdminOfferDto) {
    const admin = await this.getCurrentAdmin(userId);
    const companyId = admin.company_id;

    if (!companyId) {
      throw new BadRequestException('La empresa del admin no esta configurada');
    }

    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        state: true,
      },
    });

    if (!company) {
      throw new BadRequestException('No se encontro la empresa del admin');
    }

    if (dto.status && dto.status !== 'draft') {
      throw new BadRequestException('Al crear una oferta el estado debe ser draft');
    }

    if (!dto.category_id) {
      throw new BadRequestException('La categoria es obligatoria');
    }

    const categoryExists = await this.prisma.job_categories.findUnique({
      where: { id: dto.category_id },
      select: { id: true },
    });

    if (!categoryExists) {
      throw new BadRequestException('La categoria seleccionada no existe');
    }

    const groupedByType: Record<JobAttributeType, string[]> = {
      hard_skill: this.normalizeAttributeNames(dto.technical_skills ?? []),
      soft_skill: this.normalizeAttributeNames(dto.soft_skills ?? []),
    };

    const selectedAttributeIds: number[] = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const [type, names] of Object.entries(groupedByType) as Array<
      [JobAttributeType, string[]]
    >) {
      for (const name of names) {
        const uniqueWhere = {
          name_type: {
            name,
            type,
          },
        } as const;

        let attribute = await this.prisma.global_attributes.findUnique({
          where: uniqueWhere,
          select: {
            id: true,
            name: true,
          },
        });

        if (!attribute) {
          try {
            attribute = await this.prisma.global_attributes.create({
              data: {
                name,
                type,
              },
              select: {
                id: true,
                name: true,
              },
            });

            createdAttributes.push(attribute);
          } catch (error) {
            attribute = await this.prisma.global_attributes.findUnique({
              where: uniqueWhere,
              select: {
                id: true,
                name: true,
              },
            });

            if (!attribute) {
              throw error;
            }
          }
        }

        selectedAttributeIds.push(attribute.id);
      }
    }

    const uniqueAttributeIds = Array.from(new Set(selectedAttributeIds));

    const createdJob = await this.prisma.$transaction(async (tx) => {
      const job = await tx.jobs.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: 'draft',
          company_id: company.id,
          category_id: dto.category_id,
          city: dto.city,
          state: company.state,
          address: dto.address,
          workplace_type: dto.workplace_type,
          employment_type: dto.employment_type,
          position: dto.position,
          salary: dto.salary,
          weight_technical: dto.weight_technical,
          weight_soft: dto.weight_soft,
          weight_culture: dto.weight_culture,
          summary: dto.summary ?? null,
        },
      });

      if (uniqueAttributeIds.length > 0) {
        await tx.job_attributes.createMany({
          data: uniqueAttributeIds.map((attributeId) => ({
            job_id: job.id,
            attribute_id: attributeId,
            is_mandatory: false,
          })),
          skipDuplicates: true,
        });
      }

      return job;
    });

    await this.embeddingsQueueProducer.enqueueAttributes(
      createdAttributes.map((attribute) => ({
        attributeId: attribute.id,
        name: attribute.name,
      })),
    );

    return createdJob;
  }

  /**
   * Create a new job
   */
  async create(dto: CreateJobDto) {
    if (dto.status && dto.status !== 'draft') {
      throw new BadRequestException('Al crear una oferta el estado debe ser draft');
    }

    return this.prisma.jobs.create({
      data: {
        ...dto,
        status: 'draft',
      },
    });
  }

  /**
   * Retrieve multiple jobs with pagination and optional filters
   */
  async findAll(skip?: number, take?: number, companyId?: number, status?: string) {
    const where: Prisma.jobsWhereInput = {};
    if (companyId) where.company_id = companyId;
    if (status) where.status = status as any;

    return this.prisma.jobs.findMany({
      skip,
      take,
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Retrieve a single job by id
   */
  async findOne(id: number) {
    const job = await this.prisma.jobs.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  /**
   * Update an existing job by id
   */
  async update(id: number, dto: UpdateJobDto) {
    await this.findOne(id);
    return this.prisma.jobs.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a job by id
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.jobs.delete({
      where: { id },
    });
  }
}
