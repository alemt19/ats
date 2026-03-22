/** @format */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmbeddingsQueueProducer } from '../../common/queues/embeddings-queue.producer';
import { JobSummaryQueueProducer } from '../../common/queues/job-summary-queue.producer';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminOfferCandidatesQueryDto, AdminOffersQueryDto, CreateAdminOfferDto, CreateJobDto, UpdateJobDto } from './dto/jobs.dto';
import type { Prisma } from '../../generated/prisma/client';
import type { job_status_enum } from '../../generated/prisma/enums';

type JobAttributeType = 'hard_skill' | 'soft_skill';

type AdminSkillItemInput = {
  name: string;
  is_mandatory?: boolean;
};

type AdminOfferRecord = {
  id: number;
  title: string;
  description: string;
  status: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  workplace_type: string | null;
  employment_type: string | null;
  position: string | null;
  salary: string | null;
  weight_technical: number | null;
  weight_soft: number | null;
  weight_culture: number | null;
  created_at: Date | null;
  category_id: number | null;
  job_categories: { id: number; name: string | null } | null;
  job_attributes: Array<{
    is_mandatory: boolean | null;
    global_attributes: {
      name: string;
      type: 'hard_skill' | 'soft_skill' | 'value' | null;
    } | null;
  }>;
  _count: { applications: number };
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsQueueProducer: EmbeddingsQueueProducer,
    private readonly jobSummaryQueueProducer: JobSummaryQueueProducer,
  ) {}

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

  private normalizeAttributeNames(values: string[]) {
    const unique = new Set<string>();
    const normalizedValues: string[] = [];

    values.forEach((value) => {
      const clean = String(value).trim();
      const normalized = clean
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');

      if (!clean || !normalized || unique.has(normalized)) {
        return;
      }

      unique.add(normalized);
      normalizedValues.push(clean);
    });

    return normalizedValues.sort((a, b) => a.localeCompare(b, 'es'));
  }

  private async findGlobalAttributeByNameInsensitive(
    name: string,
    type: JobAttributeType,
  ) {
    const matches = await this.prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT id, name
      FROM global_attributes
      WHERE unaccent(name) ILIKE unaccent(${name})
        AND type::text = ${type}
      ORDER BY id ASC
      LIMIT 1
    `;

    return matches[0] ?? null;
  }

  private areNormalizedListsEqual(valuesA: string[], valuesB: string[]) {
    if (valuesA.length !== valuesB.length) {
      return false;
    }

    return valuesA.every((value, index) => value === valuesB[index]);
  }

  private normalizeAdminSkillItems(
    items: AdminSkillItemInput[] | undefined,
    fallbackNames: string[] | undefined,
  ) {
    const normalizedMap = new Map<string, { name: string; is_mandatory: boolean }>();

    for (const item of items ?? []) {
      const cleanName = String(item.name).trim();
      const normalizedName = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');

      if (!cleanName || !normalizedName) {
        continue;
      }

      const existing = normalizedMap.get(normalizedName);
      normalizedMap.set(normalizedName, {
        name: existing?.name ?? cleanName,
        is_mandatory: Boolean(existing?.is_mandatory || item.is_mandatory),
      });
    }

    for (const fallbackName of fallbackNames ?? []) {
      const cleanName = String(fallbackName).trim();
      const normalizedName = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');

      if (!cleanName || !normalizedName || normalizedMap.has(normalizedName)) {
        continue;
      }

      normalizedMap.set(normalizedName, {
        name: cleanName,
        is_mandatory: false,
      });
    }

    return Array.from(normalizedMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private areNormalizedSkillItemsEqual(
    itemsA: Array<{ name: string; is_mandatory: boolean }>,
    itemsB: Array<{ name: string; is_mandatory: boolean }>,
  ) {
    if (itemsA.length !== itemsB.length) {
      return false;
    }

    return itemsA.every((item, index) => {
      const other = itemsB[index];
      if (!other) {
        return false;
      }

      return item.name === other.name && item.is_mandatory === other.is_mandatory;
    });
  }

  private getStatusDisplayName(status: string) {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'published':
        return 'Publicado';
      case 'closed':
        return 'Cerrado';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  }

  private getWorkplaceDisplayName(value: string) {
    switch (value) {
      case 'remote':
        return 'Remoto';
      case 'onsite':
        return 'Presencial';
      case 'hybrid':
        return 'Hibrido';
      default:
        return value;
    }
  }

  private getEmploymentDisplayName(value: string) {
    switch (value) {
      case 'full_time':
        return 'Tiempo completo';
      case 'part_time':
        return 'Medio tiempo';
      case 'contract':
        return 'Contrato';
      case 'internship':
        return 'Pasantia';
      default:
        return value;
    }
  }

  private toAdminOfferDetailPayload(job: AdminOfferRecord) {
    const technicalSkillItems = job.job_attributes
      .filter(
        (link): link is { is_mandatory: boolean | null; global_attributes: { name: string; type: 'hard_skill' } } =>
          Boolean(link.global_attributes?.name && link.global_attributes.type === 'hard_skill'),
      )
      .map((link) => ({
        name: link.global_attributes.name,
        is_mandatory: Boolean(link.is_mandatory),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const softSkillItems = job.job_attributes
      .filter(
        (link): link is { is_mandatory: boolean | null; global_attributes: { name: string; type: 'soft_skill' } } =>
          Boolean(link.global_attributes?.name && link.global_attributes.type === 'soft_skill'),
      )
      .map((link) => ({
        name: link.global_attributes.name,
        is_mandatory: Boolean(link.is_mandatory),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return {
      offer: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status ?? 'draft',
        city: job.city ?? '',
        state: job.state ?? '',
        address: job.address ?? '',
        workplace_type: job.workplace_type ?? '',
        employment_type: job.employment_type ?? '',
        position: job.position ?? '',
        salary: Number(job.salary ?? 0),
        weight_technical: job.weight_technical ?? 0,
        weight_soft: job.weight_soft ?? 0,
        weight_culture: job.weight_culture ?? 0,
        category_id: job.category_id ?? 0,
        category: job.job_categories?.name?.trim() ?? '',
        technical_skills: technicalSkillItems.map((item) => item.name),
        soft_skills: softSkillItems.map((item) => item.name),
        technical_skill_items: technicalSkillItems,
        soft_skill_items: softSkillItems,
        published_at: (job.created_at ?? new Date()).toISOString(),
        candidates_count: job._count.applications,
      },
      status_display_name: this.getStatusDisplayName(job.status ?? 'draft'),
    };
  }

  private async findAdminOfferOrThrow(userId: string, offerId: number) {
    const admin = await this.getCurrentAdmin(userId);

    const job = await this.prisma.jobs.findFirst({
      where: {
        id: offerId,
        company_id: admin.company_id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        city: true,
        state: true,
        address: true,
        workplace_type: true,
        employment_type: true,
        position: true,
        salary: true,
        weight_technical: true,
        weight_soft: true,
        weight_culture: true,
        created_at: true,
        category_id: true,
        job_categories: {
          select: {
            id: true,
            name: true,
          },
        },
        job_attributes: {
          select: {
            is_mandatory: true,
            global_attributes: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Oferta no encontrada');
    }

    return job as AdminOfferRecord;
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

    const groupedByType: Record<JobAttributeType, Array<{ name: string; is_mandatory: boolean }>> = {
      hard_skill: this.normalizeAdminSkillItems(dto.technical_skill_items, dto.technical_skills),
      soft_skill: this.normalizeAdminSkillItems(dto.soft_skill_items, dto.soft_skills),
    };

    const selectedAttributes: Array<{ attribute_id: number; is_mandatory: boolean }> = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const [type, names] of Object.entries(groupedByType) as Array<
      [JobAttributeType, Array<{ name: string; is_mandatory: boolean }>]
    >) {
      for (const item of names) {
        let attribute = await this.findGlobalAttributeByNameInsensitive(item.name, type);

        if (!attribute) {
          try {
            attribute = await this.prisma.global_attributes.create({
              data: {
                name: item.name,
                type,
              },
              select: {
                id: true,
                name: true,
              },
            });

            createdAttributes.push(attribute);
          } catch (error) {
            attribute = await this.findGlobalAttributeByNameInsensitive(item.name, type);

            if (!attribute) {
              throw error;
            }
          }
        }

        selectedAttributes.push({
          attribute_id: attribute.id,
          is_mandatory: item.is_mandatory,
        });
      }
    }

    const uniqueSelectedAttributes = Array.from(
      new Map(selectedAttributes.map((item) => [item.attribute_id, item])).values(),
    );

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

      if (uniqueSelectedAttributes.length > 0) {
        await tx.job_attributes.createMany({
          data: uniqueSelectedAttributes.map((item) => ({
            job_id: job.id,
            attribute_id: item.attribute_id,
            is_mandatory: item.is_mandatory,
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

    await this.jobSummaryQueueProducer.enqueueJobSummaryEmbedding({
      jobId: createdJob.id,
    });

    return createdJob;
  }

  async getAdminOfferDetail(userId: string, offerId: number) {
    const job = await this.findAdminOfferOrThrow(userId, offerId);
    return this.toAdminOfferDetailPayload(job);
  }

  async listAdminOffers(userId: string, query: AdminOffersQueryDto) {
    const admin = await this.getCurrentAdmin(userId);
    const companyId = admin.company_id as number;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.jobsWhereInput = {
      company_id: companyId,
    };

    if (query.title?.trim()) {
      where.title = {
        contains: query.title.trim(),
        mode: 'insensitive',
      };
    }

    if (query.workplace_type && query.workplace_type !== 'all') {
      where.workplace_type = query.workplace_type as any;
    }

    if (query.employment_type && query.employment_type !== 'all') {
      where.employment_type = query.employment_type as any;
    }

    if (query.city && query.city !== 'all') {
      where.city = {
        equals: query.city,
        mode: 'insensitive',
      };
    }

    if (query.state && query.state !== 'all') {
      where.state = {
        equals: query.state,
        mode: 'insensitive',
      };
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status as any;
    }

    if (query.category && query.category !== 'all') {
      where.job_categories = {
        name: {
          equals: query.category,
          mode: 'insensitive',
        },
      };
    }

    const [total, jobs, company] = await Promise.all([
      this.prisma.jobs.count({ where }),
      this.prisma.jobs.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          status: true,
          workplace_type: true,
          employment_type: true,
          created_at: true,
          job_categories: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      this.prisma.companies.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
    ]);

    return {
      items: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: company?.name?.trim() || 'Empresa',
        category: job.job_categories?.name?.trim() || 'Sin categoria',
        city: job.city?.trim() || '',
        state: job.state?.trim() || '',
        candidateCount: job._count.applications,
        createdAt: (job.created_at ?? new Date()).toISOString().split('T')[0] || '',
        status: (job.status ?? 'draft') as 'draft' | 'published' | 'closed' | 'archived',
        workplace_type: job.workplace_type ?? 'onsite',
        employment_type: job.employment_type ?? 'full_time',
      })),
      total,
      page,
      pageSize,
    };
  }

  async getAdminOffersCatalogs(userId: string) {
    const admin = await this.getCurrentAdmin(userId);
    const companyId = admin.company_id as number;

    const [categories, jobs, company, attributes] = await Promise.all([
      this.prisma.job_categories.findMany({
        orderBy: { name: 'asc' },
        select: { name: true },
      }),
      this.prisma.jobs.findMany({
        where: { company_id: companyId },
        select: {
          city: true,
          state: true,
          workplace_type: true,
          employment_type: true,
          status: true,
        },
      }),
      this.prisma.companies.findUnique({
        where: { id: companyId },
        select: { city: true, state: true },
      }),
      this.prisma.global_attributes.findMany({
        where: {
          type: {
            in: ['hard_skill', 'soft_skill'],
          },
        },
        orderBy: { name: 'asc' },
        select: { name: true, type: true },
      }),
    ]);

    const citySet = new Set<string>();
    const stateSet = new Set<string>();
    const workplaceSet = new Set<string>();
    const employmentSet = new Set<string>();
    const statusSet = new Set<string>();

    if (company?.city?.trim()) {
      citySet.add(company.city.trim());
    }

    if (company?.state?.trim()) {
      stateSet.add(company.state.trim());
    }

    jobs.forEach((job) => {
      if (job.city?.trim()) {
        citySet.add(job.city.trim());
      }

      if (job.state?.trim()) {
        stateSet.add(job.state.trim());
      }

      if (job.workplace_type) {
        workplaceSet.add(job.workplace_type);
      }

      if (job.employment_type) {
        employmentSet.add(job.employment_type);
      }

      if (job.status) {
        statusSet.add(job.status);
      }
    });

    if (workplaceSet.size === 0) {
      workplaceSet.add('onsite');
      workplaceSet.add('remote');
      workplaceSet.add('hybrid');
    }

    if (employmentSet.size === 0) {
      employmentSet.add('full_time');
      employmentSet.add('part_time');
      employmentSet.add('contract');
      employmentSet.add('internship');
    }

    if (statusSet.size === 0) {
      statusSet.add('draft');
      statusSet.add('published');
      statusSet.add('closed');
      statusSet.add('archived');
    }

    const technicalSkills = this.normalizeAttributeNames(
      attributes
        .filter((attribute) => attribute.type === 'hard_skill')
        .map((attribute) => attribute.name),
    );

    const softSkills = this.normalizeAttributeNames(
      attributes
        .filter((attribute) => attribute.type === 'soft_skill')
        .map((attribute) => attribute.name),
    );

    return {
      categories: categories
        .map((category) => category.name?.trim() || '')
        .filter((name) => Boolean(name)),
      cities: Array.from(citySet).sort((a, b) => a.localeCompare(b)),
      states: Array.from(stateSet).sort((a, b) => a.localeCompare(b)),
      workplace_types: Array.from(workplaceSet)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
          technical_name: value,
          display_name: this.getWorkplaceDisplayName(value),
        })),
      employment_types: Array.from(employmentSet)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
          technical_name: value,
          display_name: this.getEmploymentDisplayName(value),
        })),
      statuses: Array.from(statusSet)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
          technical_name: value,
          display_name: this.getStatusDisplayName(value),
        })),
      technical_skills: technicalSkills,
      soft_skills: softSkills,
    };
  }

  async updateAdminOffer(userId: string, offerId: number, dto: CreateAdminOfferDto) {
    const existingOffer = await this.findAdminOfferOrThrow(userId, offerId);
    const currentStatus = existingOffer.status ?? 'draft';
    const nextStatus = dto.status ?? currentStatus;

    if (currentStatus !== 'draft' && nextStatus === 'draft') {
      throw new BadRequestException('No se puede volver una oferta a estado borrador');
    }

    if (currentStatus !== 'draft') {
      const currentTechnicalSkills = this.normalizeAdminSkillItems(
        existingOffer.job_attributes
          .filter(
            (link): link is { is_mandatory: boolean | null; global_attributes: { name: string; type: 'hard_skill' } } =>
              Boolean(link.global_attributes?.name && link.global_attributes.type === 'hard_skill'),
          )
          .map((link) => ({
            name: link.global_attributes.name,
            is_mandatory: Boolean(link.is_mandatory),
          })),
        undefined,
      );

      const currentSoftSkills = this.normalizeAdminSkillItems(
        existingOffer.job_attributes
          .filter(
            (link): link is { is_mandatory: boolean | null; global_attributes: { name: string; type: 'soft_skill' } } =>
              Boolean(link.global_attributes?.name && link.global_attributes.type === 'soft_skill'),
          )
          .map((link) => ({
            name: link.global_attributes.name,
            is_mandatory: Boolean(link.is_mandatory),
          })),
        undefined,
      );

      const incomingTechnicalSkills = this.normalizeAdminSkillItems(dto.technical_skill_items, dto.technical_skills);
      const incomingSoftSkills = this.normalizeAdminSkillItems(dto.soft_skill_items, dto.soft_skills);

      const hasBlockedChanges =
        dto.title.trim() !== existingOffer.title.trim() ||
        String(dto.position ?? '').trim() !== (existingOffer.position ?? '').trim() ||
        dto.weight_technical !== (existingOffer.weight_technical ?? 0) ||
        dto.weight_soft !== (existingOffer.weight_soft ?? 0) ||
        dto.weight_culture !== (existingOffer.weight_culture ?? 0) ||
        !this.areNormalizedSkillItemsEqual(incomingTechnicalSkills, currentTechnicalSkills) ||
        !this.areNormalizedSkillItemsEqual(incomingSoftSkills, currentSoftSkills);

      if (hasBlockedChanges) {
        throw new BadRequestException(
          'En ofertas no borrador solo se puede editar descripcion, estado (sin volver a borrador), salario, ciudad, direccion, modalidad, tipo de empleo y categoria',
        );
      }
    }

    const admin = await this.getCurrentAdmin(userId);
    const company = await this.prisma.companies.findUnique({
      where: { id: admin.company_id! },
      select: { state: true },
    });

    if (!company) {
      throw new BadRequestException('No se encontro la empresa del admin');
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

    const groupedByType: Record<JobAttributeType, Array<{ name: string; is_mandatory: boolean }>> = {
      hard_skill: this.normalizeAdminSkillItems(dto.technical_skill_items, dto.technical_skills),
      soft_skill: this.normalizeAdminSkillItems(dto.soft_skill_items, dto.soft_skills),
    };

    const selectedAttributes: Array<{ attribute_id: number; is_mandatory: boolean }> = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const [type, names] of Object.entries(groupedByType) as Array<
      [JobAttributeType, Array<{ name: string; is_mandatory: boolean }>]
    >) {
      for (const item of names) {
        let attribute = await this.findGlobalAttributeByNameInsensitive(item.name, type);

        if (!attribute) {
          try {
            attribute = await this.prisma.global_attributes.create({
              data: {
                name: item.name,
                type,
              },
              select: {
                id: true,
                name: true,
              },
            });

            createdAttributes.push(attribute);
          } catch (error) {
            attribute = await this.findGlobalAttributeByNameInsensitive(item.name, type);

            if (!attribute) {
              throw error;
            }
          }
        }

        selectedAttributes.push({
          attribute_id: attribute.id,
          is_mandatory: item.is_mandatory,
        });
      }
    }

    const uniqueSelectedAttributes = Array.from(
      new Map(selectedAttributes.map((item) => [item.attribute_id, item])).values(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.jobs.update({
        where: { id: offerId },
        data: {
          title: dto.title,
          description: dto.description,
          status: nextStatus as job_status_enum,
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
          category_id: dto.category_id,
        },
      });

      await tx.job_attributes.deleteMany({
        where: { job_id: offerId },
      });

      if (uniqueSelectedAttributes.length > 0) {
        await tx.job_attributes.createMany({
          data: uniqueSelectedAttributes.map((item) => ({
            job_id: offerId,
            attribute_id: item.attribute_id,
            is_mandatory: item.is_mandatory,
          })),
          skipDuplicates: true,
        });
      }
    });

    await this.embeddingsQueueProducer.enqueueAttributes(
      createdAttributes.map((attribute) => ({
        attributeId: attribute.id,
        name: attribute.name,
      })),
    );

    await this.jobSummaryQueueProducer.enqueueJobSummaryEmbedding({
      jobId: offerId,
    });

    return this.getAdminOfferDetail(userId, offerId);
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

  async findLatestPublishedOffers(limit = 3) {
    const items = await this.prisma.jobs.findMany({
      where: {
        status: 'published' as any,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: Math.min(Math.max(limit, 1), 10),
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        position: true,
        salary: true,
        workplace_type: true,
        employment_type: true,
        job_categories: {
          select: {
            name: true,
          },
        },
      },
    });

    return items.map((job) => ({
      id: job.id,
      title: job.title,
      category: job.job_categories?.name?.trim() || 'Sin categoria',
      city: job.city?.trim() || '',
      state: job.state?.trim() || '',
      position: job.position?.trim() || '',
      salary: Number.parseFloat(job.salary ?? '0') || 0,
      workplace_type: job.workplace_type ?? 'onsite',
      employment_type: job.employment_type ?? 'full_time',
    }));
  }

  async listPublicOffers(query: {
    title?: string;
    category?: string;
    workplace_type?: string;
    employment_type?: string;
    city?: string;
    page?: number;
    pageSize?: number;
  }, userId?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.jobsWhereInput = {
      status: 'published',
    };

    if (query.title?.trim()) {
      const title = query.title.trim();
      where.OR = [
        {
          title: {
            contains: title,
            mode: 'insensitive',
          },
        },
        {
          position: {
            contains: title,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.category && query.category !== 'all') {
      where.job_categories = {
        name: {
          equals: query.category,
          mode: 'insensitive',
        },
      };
    }

    if (query.workplace_type && query.workplace_type !== 'all') {
      where.workplace_type = query.workplace_type as any;
    }

    if (query.employment_type && query.employment_type !== 'all') {
      where.employment_type = query.employment_type as any;
    }

    if (query.city && query.city !== 'all') {
      where.city = {
        equals: query.city,
        mode: 'insensitive',
      };
    }

    const [total, jobs] = await Promise.all([
      this.prisma.jobs.count({ where }),
      this.prisma.jobs.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          position: true,
          salary: true,
          workplace_type: true,
          employment_type: true,
          job_categories: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const baseItems = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      category: job.job_categories?.name?.trim() || 'Sin categoria',
      city: job.city?.trim() || '',
      state: job.state?.trim() || '',
      position: job.position?.trim() || '',
      salary: Number.parseFloat(job.salary ?? '0') || 0,
      workplace_type: job.workplace_type ?? 'onsite',
      employment_type: job.employment_type ?? 'full_time',
    }));

    if (!userId || baseItems.length === 0) {
      return {
        items: baseItems,
        total,
        page,
        pageSize,
      };
    }

    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!candidate) {
      return {
        items: baseItems.map((item) => ({
          ...item,
          hasApplied: false,
          applicationId: null,
          applicationStatusTechnicalName: null,
        })),
        total,
        page,
        pageSize,
      };
    }

    const jobIds = baseItems.map((item) => item.id);
    const applications = await this.prisma.applications.findMany({
      where: {
        candidate_id: candidate.id,
        job_id: { in: jobIds },
      },
      select: {
        id: true,
        job_id: true,
        status: true,
      },
    });

    const applicationByJobId = new Map<number, { applicationId: number; status: string | null }>();
    applications.forEach((application) => {
      if (!application.job_id || applicationByJobId.has(application.job_id)) {
        return;
      }

      applicationByJobId.set(application.job_id, {
        applicationId: application.id,
        status: application.status,
      });
    });

    return {
      items: baseItems.map((item) => {
        const application = applicationByJobId.get(item.id);

        if (!application) {
          return {
            ...item,
            hasApplied: false,
            applicationId: null,
            applicationStatusTechnicalName: null,
          };
        }

        return {
          ...item,
          hasApplied: true,
          applicationId: application.applicationId,
          applicationStatusTechnicalName: application.status,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async getPublicOffersCatalogs() {
    const [categories, jobs] = await Promise.all([
      this.prisma.job_categories.findMany({
        orderBy: { name: 'asc' },
        select: { name: true },
      }),
      this.prisma.jobs.findMany({
        where: {
          status: 'published',
        },
        select: {
          city: true,
          workplace_type: true,
          employment_type: true,
        },
      }),
    ]);

    const citySet = new Set<string>();
    const workplaceSet = new Set<string>();
    const employmentSet = new Set<string>();

    jobs.forEach((job) => {
      if (job.city?.trim()) {
        citySet.add(job.city.trim());
      }

      if (job.workplace_type) {
        workplaceSet.add(job.workplace_type);
      }

      if (job.employment_type) {
        employmentSet.add(job.employment_type);
      }
    });

    if (workplaceSet.size === 0) {
      workplaceSet.add('onsite');
      workplaceSet.add('remote');
      workplaceSet.add('hybrid');
    }

    if (employmentSet.size === 0) {
      employmentSet.add('full_time');
      employmentSet.add('part_time');
      employmentSet.add('contract');
      employmentSet.add('internship');
    }

    return {
      categories: categories
        .map((category) => category.name?.trim() || '')
        .filter((name) => Boolean(name)),
      cities: Array.from(citySet).sort((a, b) => a.localeCompare(b)),
      workplace_types: Array.from(workplaceSet)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
          technical_name: value,
          display_name: this.getWorkplaceDisplayName(value),
        })),
      employment_types: Array.from(employmentSet)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
          technical_name: value,
          display_name: this.getEmploymentDisplayName(value),
        })),
    };
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

  /**
   * List candidates who applied to an admin offer with AI scores and filters
   */
  async getAdminOfferCandidates(userId: string, offerId: number, query: AdminOfferCandidatesQueryDto) {
    const admin = await this.getCurrentAdmin(userId);

    const jobExists = await this.prisma.jobs.findFirst({
      where: { id: offerId, company_id: admin.company_id },
      select: { id: true },
    });
    if (!jobExists) throw new NotFoundException('Oferta no encontrada');

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 8;
    const search = (query.search ?? '').trim().toLowerCase();
    const searchTerms = search
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);
    const status = (query.status ?? 'all').trim();

    // Score ranges arrive as 0-100 percentages; DB stores 0-1 floats
    const techMin = (query.technical_min ?? 0) / 100;
    const techMax = (query.technical_max ?? 100) / 100;
    const softMin = (query.soft_min ?? 0) / 100;
    const softMax = (query.soft_max ?? 100) / 100;
    const cultMin = (query.culture_min ?? 0) / 100;
    const cultMax = (query.culture_max ?? 100) / 100;
    const finalMin = (query.final_min ?? 0) / 100;
    const finalMax = (query.final_max ?? 100) / 100;

    const isDefaultRange = (min: number, max: number) => min === 0 && max === 1;

    const where: Prisma.applicationsWhereInput = {
      job_id: offerId,
      ...(status !== 'all' ? { status } : {}),
      ...(searchTerms.length > 0
        ? {
            candidates: {
              AND: searchTerms.map((term) => ({
                OR: [
                  { name: { contains: term, mode: 'insensitive' } },
                  { lastname: { contains: term, mode: 'insensitive' } },
                ],
              })),
            },
          }
        : {}),
      ...(isDefaultRange(techMin, techMax) ? {} : { match_technical_score: { gte: techMin, lte: techMax } }),
      ...(isDefaultRange(softMin, softMax) ? {} : { match_soft_score: { gte: softMin, lte: softMax } }),
      ...(isDefaultRange(cultMin, cultMax) ? {} : { match_culture_score: { gte: cultMin, lte: cultMax } }),
      ...(isDefaultRange(finalMin, finalMax) ? {} : { overall_score: { gte: finalMin, lte: finalMax } }),
    };

    const [total, items] = await Promise.all([
      this.prisma.applications.count({ where }),
      this.prisma.applications.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { overall_score: 'desc' },
        select: {
          id: true,
          candidate_id: true,
          match_technical_score: true,
          match_soft_score: true,
          match_culture_score: true,
          overall_score: true,
          status: true,
          candidates: {
            select: { name: true, lastname: true },
          },
        },
      }),
    ]);

    const toPercent = (val: number | null) => Math.round((val ?? 0) * 100);

    return {
      items: items.map((app) => ({
        application_id: String(app.id),
        candidate_id: String(app.candidate_id ?? ''),
        first_name: app.candidates?.name ?? '',
        last_name: app.candidates?.lastname ?? '',
        technical_score: toPercent(app.match_technical_score),
        soft_score: toPercent(app.match_soft_score),
        culture_score: toPercent(app.match_culture_score),
        final_score: toPercent(app.overall_score),
        status: app.status ?? 'applied',
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get full detail of a candidate-application for admin review
   */
  async getAdminOfferCandidateDetail(userId: string, offerId: number, applicationId: number) {
    const admin = await this.getCurrentAdmin(userId);

    const application = await this.prisma.applications.findFirst({
      where: {
        id: applicationId,
        job_id: offerId,
        jobs: { company_id: admin.company_id },
      },
      select: {
        id: true,
        status: true,
        match_technical_score: true,
        match_soft_score: true,
        match_culture_score: true,
        overall_score: true,
        ai_feedback: true,
        jobs: { select: { title: true } },
        candidates: {
          select: {
            id: true,
            name: true,
            lastname: true,
            profile_picture: true,
            phone: true,
            state: true,
            country: true,
            contact_page: true,
            cv_file_url: true,
            behavioral_ans_1: true,
            behavioral_ans_2: true,
            dress_code: true,
            collaboration_style: true,
            work_pace: true,
            level_of_autonomy: true,
            dealing_with_management: true,
            level_of_monitoring: true,
            user: { select: { email: true } },
            candidate_attributes: {
              select: {
                global_attributes: { select: { name: true, type: true } },
              },
            },
          },
        },
      },
    });

    if (!application) throw new NotFoundException('Aplicación no encontrada');
    const c = application.candidates;
    if (!c) throw new NotFoundException('Candidato no encontrado');

    const attrs = c.candidate_attributes.map((ca) => ca.global_attributes).filter(Boolean);
    const technicalSkills = attrs.filter((a) => a?.type === 'hard_skill').map((a) => a!.name);
    const softSkills = attrs.filter((a) => a?.type === 'soft_skill').map((a) => a!.name);
    const values = attrs.filter((a) => a?.type === 'value').map((a) => a!.name);

    const culturalPreferences: Record<string, string> = {};
    if (c.dress_code) culturalPreferences['dress_code'] = c.dress_code;
    if (c.collaboration_style) culturalPreferences['collaboration_style'] = c.collaboration_style;
    if (c.work_pace) culturalPreferences['work_pace'] = c.work_pace;
    if (c.level_of_autonomy) culturalPreferences['level_of_autonomy'] = c.level_of_autonomy;
    if (c.dealing_with_management) culturalPreferences['dealing_with_management'] = c.dealing_with_management;
    if (c.level_of_monitoring) culturalPreferences['level_of_monitoring'] = c.level_of_monitoring;

    const toPercent = (val: number | null) => Math.round((val ?? 0) * 100);

    const aiFeedback = this.normalizeAiFeedbackSections(application.ai_feedback);

    return {
      candidate_id: c.id,
      application_id: application.id,
      name: c.name ?? '',
      lastname: c.lastname ?? '',
      profile_picture: c.profile_picture ?? undefined,
      email: c.user?.email ?? '',
      phone: c.phone ?? undefined,
      contact_page: c.contact_page ?? undefined,
      state: c.state ?? undefined,
      country: c.country ?? undefined,
      offer_title: application.jobs?.title ?? '',
      ai_feedback: aiFeedback,
      application_status: application.status ?? 'applied',
      technical_score: toPercent(application.match_technical_score),
      soft_score: toPercent(application.match_soft_score),
      culture_score: toPercent(application.match_culture_score),
      technical_skills: technicalSkills,
      soft_skills: softSkills,
      values,
      cultural_preferences: culturalPreferences,
      cv_url: c.cv_file_url ?? undefined,
      behavioral_ans_1: c.behavioral_ans_1 ?? '',
      behavioral_ans_2: c.behavioral_ans_2 ?? '',
    };
  }

  private parseDashboardDateRange(from?: string, to?: string) {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    defaultStart.setHours(0, 0, 0, 0);

    const hasFrom = Boolean(from && from.trim().length > 0);
    const hasTo = Boolean(to && to.trim().length > 0);

    const startDate = hasFrom ? new Date(`${from}T00:00:00.000Z`) : defaultStart;
    const endDate = hasTo ? new Date(`${to}T23:59:59.999Z`) : now;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Rango de fechas inválido');
    }

    if (endDate < startDate) {
      throw new BadRequestException('La fecha final no puede ser menor a la inicial');
    }

    return {
      startDate,
      endDate,
    };
  }

  async getAdminDashboardData(userId: string, from?: string, to?: string) {
    const admin = await this.getCurrentAdmin(userId);
    const companyId = admin.company_id;

    if (!companyId) {
      throw new BadRequestException('La empresa del admin no esta configurada');
    }

    const { startDate, endDate } = this.parseDashboardDateRange(from, to);

    const [newOffers, newApplications, culturalAlignmentAggregate, newCandidatesCount, topOffersRows, progressRows] =
      await Promise.all([
        this.prisma.jobs.count({
          where: {
            company_id: companyId,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.applications.count({
          where: {
            jobs: { company_id: companyId },
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.applications.aggregate({
          where: {
            jobs: { company_id: companyId },
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          _avg: {
            match_culture_score: true,
          },
        }),
        this.prisma.candidates.count({
          where: {
            created_at: {
              gte: startDate,
              lte: endDate,
            },
            applications: {
              some: {
                jobs: { company_id: companyId },
              },
            },
          },
        }),
        this.prisma.$queryRaw<Array<{ offer_name: string; candidates: bigint | number }>>`
          SELECT j.title AS offer_name,
                 COUNT(a.id) AS candidates
          FROM jobs j
          LEFT JOIN applications a
            ON a.job_id = j.id
           AND a.created_at >= ${startDate}
           AND a.created_at <= ${endDate}
          WHERE j.company_id = ${companyId}
          GROUP BY j.id, j.title
          ORDER BY candidates DESC, j.id DESC
          LIMIT 5
        `,
        this.prisma.$queryRaw<Array<{ status: string; count: bigint | number }>>`
          SELECT CASE
                   WHEN ar.status = 'contacted' THEN 'pre_screening'
                   ELSE ar.status
                 END AS status,
                 COUNT(ar.id) AS count
          FROM applications_registers ar
          INNER JOIN applications a ON a.id = ar.application_id
          INNER JOIN jobs j ON j.id = a.job_id
          WHERE j.company_id = ${companyId}
            AND ar.created_at >= ${startDate}
            AND ar.created_at <= ${endDate}
          GROUP BY CASE
                     WHEN ar.status = 'contacted' THEN 'pre_screening'
                     ELSE ar.status
                   END
        `,
      ]);

    const parseCount = (value: bigint | number) => Number(value);
    const culturalAlignment = Math.round((culturalAlignmentAggregate._avg.match_culture_score ?? 0) * 100);

    const statusLabelMap = new Map<string, string>([
      ['applied', 'Postulado'],
      ['pre_screening', 'Preseleccionado'],
      ['hired', 'Contratado'],
      ['rejected', 'Rechazado'],
    ]);

    const progressCounts = new Map<string, number>();
    progressRows.forEach((row) => {
      progressCounts.set(row.status, parseCount(row.count));
    });

    return {
      metrics: {
        activeOffers: newOffers,
        newCandidates: newCandidatesCount,
        newApplications,
        culturalAlignment,
      },
      candidateProgress: Array.from(statusLabelMap.entries()).map(([technicalName, label]) => ({
        technical_name: technicalName,
        label,
        count: progressCounts.get(technicalName) ?? 0,
      })),
      topOffers: topOffersRows.map((row) => ({
        name: row.offer_name,
        candidates: parseCount(row.candidates),
      })),
    };
  }
}
