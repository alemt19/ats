/** @format */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsQueueProducer } from '../../common/queues/embeddings-queue.producer';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/companies.dto';
import { UpdateCompanyConfigDto } from './dto/company-config.dto';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsQueueProducer: EmbeddingsQueueProducer,
		private readonly storage: StorageService,
  ) {}

  private toNonEmptyString(value: string | null | undefined) {
    return (value ?? '').trim();
  }

  private normalizeAttributeKey(value: string) {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }

  private normalizeCompanyValues(values: string[]) {
    const unique = new Set<string>();
    const normalizedValues: string[] = [];

    values.forEach((value) => {
      const clean = String(value).trim();
      const normalized = this.normalizeAttributeKey(clean);
      if (!clean || !normalized) {
        return;
      }

      if (unique.has(normalized)) {
        return;
      }

      unique.add(normalized);
      normalizedValues.push(clean);
    });

    return normalizedValues;
  }

  private async findGlobalValueAttributeByNameInsensitive(name: string) {
    const matches = await this.prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT id, name
      FROM global_attributes
      WHERE unaccent(name) ILIKE unaccent(${name})
        AND type::text = 'value'
      ORDER BY id ASC
      LIMIT 1
    `;

    return matches[0] ?? null;
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

    return admin;
  }

  private async getOrCreateSingletonCompany(userId: string) {
    const admin = await this.getCurrentAdmin(userId);

    let company = admin.company_id
      ? await this.prisma.companies.findUnique({ where: { id: admin.company_id } })
      : null;

    if (!company) {
      company = await this.prisma.companies.findFirst({
        orderBy: { id: 'asc' },
      });
    }

    if (!company) {
      company = await this.prisma.companies.create({
        data: {
          name: 'Empresa',
        },
      });
    }

    if (admin.company_id !== company.id) {
      await this.prisma.user_admin.update({
        where: { id: admin.id },
        data: { company_id: company.id },
      });
    }

    return company;
  }

  async getCompanyConfig(userId: string) {
    const company = await this.getOrCreateSingletonCompany(userId);

    const [allValueOptions, companyValueLinks] = await Promise.all([
      this.prisma.global_attributes.findMany({
        where: { type: 'value' },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.company_attributes.findMany({
        where: { company_id: company.id },
        select: {
          global_attributes: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
    ]);

    const companyValues = companyValueLinks
      .map((link) => link.global_attributes)
      .filter(
        (attribute): attribute is { id: number; name: string; type: 'value' } =>
          Boolean(attribute?.name && attribute.type === 'value'),
      )
      .map((attribute) => attribute.name)
      .sort((a, b) => a.localeCompare(b, 'es'));

    return {
      initialData: {
        name: this.toNonEmptyString(company.name),
        logo: this.toNonEmptyString(company.logo_url),
        contact_email: this.toNonEmptyString(company.contact_email),
        country: this.toNonEmptyString(company.country),
        state: this.toNonEmptyString(company.state),
        city: this.toNonEmptyString(company.city),
        address: this.toNonEmptyString(company.address),
        description: this.toNonEmptyString(company.description),
        mision: this.toNonEmptyString(company.mision),
        values: companyValues,
        preferences: {
          dress_code: company.dress_code ?? undefined,
          colaboration_style: company.colaboration_style ?? undefined,
          work_pace: company.work_pace ?? undefined,
          level_of_autonomy: company.level_of_autonomy ?? undefined,
          dealing_with_management: company.dealing_with_management ?? undefined,
          level_of_monitoring: company.level_of_monitoring ?? undefined,
        },
      },
      companyValueOptions: allValueOptions.map((item) => item.name).filter(Boolean),
    };
  }

  async updateCompanyConfig(userId: string, dto: UpdateCompanyConfigDto & { logo_url?: string | null }) {
    const company = await this.getOrCreateSingletonCompany(userId);
    let parsedValuesFromValuesField: unknown = [];
    if (typeof dto.values === 'string') {
      try {
        parsedValuesFromValuesField = JSON.parse(dto.values);
      } catch {
        throw new BadRequestException('Invalid values payload');
      }
    }

    let parsedValuesFromJson: unknown = [];
    if (typeof dto.values_json === 'string') {
      try {
        parsedValuesFromJson = JSON.parse(dto.values_json);
      } catch {
        throw new BadRequestException('Invalid values payload');
      }
    }

    const rawValues = Array.isArray(dto.values)
      ? dto.values
      : Array.isArray(parsedValuesFromValuesField)
        ? parsedValuesFromValuesField
        : parsedValuesFromJson;

    const normalizedValues = this.normalizeCompanyValues(
      Array.isArray(rawValues) ? rawValues.map((value) => String(value)) : [],
    );

    const allSelectedAttributes: Array<{ id: number; name: string }> = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const name of normalizedValues) {
      let attribute = await this.findGlobalValueAttributeByNameInsensitive(name);

      if (!attribute) {
        try {
          attribute = await this.prisma.global_attributes.create({
            data: {
              name,
              type: 'value',
            },
            select: {
              id: true,
              name: true,
            },
          });

          createdAttributes.push(attribute);
        } catch (error) {
          attribute = await this.findGlobalValueAttributeByNameInsensitive(name);

          if (!attribute) {
            throw error;
          }
        }
      }

      allSelectedAttributes.push(attribute);
    }

    const uniqueSelectedAttributes = Array.from(
      new Map(allSelectedAttributes.map((attribute) => [attribute.id, attribute])).values(),
    );

    await this.prisma.$transaction([
      this.prisma.companies.update({
        where: { id: company.id },
        data: {
          name: dto.name.trim(),
          logo_url: dto.logo_url ?? (dto.logo?.trim() || null),
          contact_email: dto.contact_email?.trim() || null,
          country: dto.country?.trim() || null,
          state: dto.state?.trim() || null,
          city: dto.city?.trim() || null,
          address: dto.address?.trim() || null,
          description: dto.description?.trim() || null,
          mision: dto.mision?.trim() || null,
          dress_code: dto.dress_code || null,
          colaboration_style: dto.colaboration_style || null,
          work_pace: dto.work_pace || null,
          level_of_autonomy: dto.level_of_autonomy || null,
          dealing_with_management: dto.dealing_with_management || null,
          level_of_monitoring: dto.level_of_monitoring || null,
        },
      }),
      this.prisma.company_attributes.deleteMany({
        where: { company_id: company.id },
      }),
      ...(allSelectedAttributes.length > 0
        ? [
            this.prisma.company_attributes.createMany({
              data: uniqueSelectedAttributes.map((attribute) => ({
                company_id: company.id,
                attribute_id: attribute.id,
              })),
            }),
          ]
        : []),
    ]);

    await this.embeddingsQueueProducer.enqueueAttributes(
      createdAttributes.map((attribute) => ({
        attributeId: attribute.id,
        name: attribute.name,
      })),
    );

    return this.getCompanyConfig(userId);
  }

	/**
	 * Create a new company
	 */
	async create(dto: CreateCompanyDto) {
		return this.prisma.companies.create({
			data: dto,
		});
	}

	/**
	 * Retrieve multiple companies with pagination
	 */
	async findAll(skip?: number, take?: number) {
		return this.prisma.companies.findMany({
			skip,
			take,
			orderBy: { created_at: 'desc' },
		});
	}

	/**
	 * Retrieve a single company by id
	 */
	async findOne(id: number) {
		const company = await this.prisma.companies.findUnique({
			where: { id },
		});
		if (!company) {
			throw new NotFoundException(`Company with ID ${id} not found`);
		}
		return company;
	}

	/**
	 * Update an existing company by id
	 */
	async update(id: number, dto: UpdateCompanyDto) {
		await this.findOne(id);
		return this.prisma.companies.update({
			where: { id },
			data: dto,
		});
	}

	async uploadLogo(id: number, file: Express.Multer.File) {
		await this.findOne(id);
		const upload = await this.storage.uploadCompanyLogo(id, file);
		return this.prisma.companies.update({
			where: { id },
			data: { logo_url: upload.publicUrl },
		});
	}

	/**
	 * Delete a company by id
	 */
	async remove(id: number) {
		await this.findOne(id);
		return this.prisma.companies.delete({
			where: { id },
		});
	}
}
