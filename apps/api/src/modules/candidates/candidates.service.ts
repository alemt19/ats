/** @format */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmbeddingsQueueProducer } from '../../common/queues/embeddings-queue.producer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';
import { UpdateMyCompetenciasValoresDto, UpdateMyCredencialesExperienciasDto } from './dto/competencias-valores.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageService } from '../../common/storage/storage.service';
import { CV_PARSE_QUEUE } from '../queues/queues.constants';

type CandidateAttributeType = 'hard_skill' | 'soft_skill' | 'value' | 'credential';

type CandidateExperienceInput = {
  position: string;
  company_name: string;
  start_date: string;
  end_date: string | null;
};

type CandidateExperienceRecord = {
  position: string;
  company_name: string;
  start_date: string;
  end_date: string | null;
};

type CandidateCompetenciasValoresResponse = {
  initialData: {
    cv_url: string;
    behavioral_ans_1: string;
    behavioral_ans_2: string;
    technical_skills: string[];
    soft_skills: string[];
    values: string[];
    credentials: string[];
    experiences: CandidateExperienceRecord[];
  };
  technicalSkillOptions: string[];
  softSkillOptions: string[];
  valueOptions: string[];
  credentialOptions: string[];
};

function parseDateOnlyToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateOnlyString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function sortCandidateExperiences(experiences: CandidateExperienceRecord[]) {
  return [...experiences].sort((left, right) => {
    const leftEnd = left.end_date ? new Date(`${left.end_date}T00:00:00.000Z`).getTime() : null;
    const rightEnd = right.end_date ? new Date(`${right.end_date}T00:00:00.000Z`).getTime() : null;

    if (leftEnd === null && rightEnd !== null) {
      return -1;
    }

    if (leftEnd !== null && rightEnd === null) {
      return 1;
    }

    if (leftEnd !== rightEnd) {
      return (rightEnd ?? 0) - (leftEnd ?? 0);
    }

    const leftStart = new Date(`${left.start_date}T00:00:00.000Z`).getTime();
    const rightStart = new Date(`${right.start_date}T00:00:00.000Z`).getTime();

    return rightStart - leftStart;
  });
}

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsQueueProducer: EmbeddingsQueueProducer,
		private readonly storage: StorageService,
		@InjectQueue(CV_PARSE_QUEUE)
		private readonly cvParseQueue: Queue,
  ) {}

  private normalizeAttributeKey(value: string) {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }

  private normalizeAttributeNames(values: string[]) {
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

  private async findGlobalAttributeByNameInsensitive(
    name: string,
    type: CandidateAttributeType,
  ): Promise<{ id: number; name: string } | null> {
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

  private parseStringArray(value: string, fieldName: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid array payload');
      }

      return parsed.map((item) => String(item));
    } catch {
      throw new BadRequestException(`Invalid ${fieldName} payload`);
    }
  }

  private parseExperienceArray(value: string): CandidateExperienceInput[] {
    try {
      const parsed = JSON.parse(value) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid array payload');
      }

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      return parsed
        .map((item): CandidateExperienceInput | null => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const record = item as Record<string, unknown>;
          const position = typeof record.position === 'string' ? record.position.trim() : '';
          const companyName = typeof record.company_name === 'string' ? record.company_name.trim() : '';
          const startDate = typeof record.start_date === 'string' ? record.start_date.trim() : '';
          const endDate =
            typeof record.end_date === 'string'
              ? record.end_date.trim() || null
              : record.end_date === null
                ? null
                : undefined;

          if (!position || !companyName || !startDate) {
            return null;
          }

          const parsedStartDate = parseDateOnlyToDate(startDate);

          if (!parsedStartDate) {
            throw new BadRequestException('La fecha de inicio de la experiencia no es válida');
          }

          if (parsedStartDate.getTime() > todayStart.getTime()) {
            throw new BadRequestException('La fecha de inicio no puede ser futura');
          }

          let parsedEndDate: Date | null = null;

          if (typeof endDate === 'string') {
            parsedEndDate = parseDateOnlyToDate(endDate);

            if (!parsedEndDate) {
              throw new BadRequestException('La fecha de fin de la experiencia no es válida');
            }

            if (parsedEndDate.getTime() > todayStart.getTime()) {
              throw new BadRequestException('La fecha de fin no puede ser futura');
            }

            if (parsedStartDate.getTime() > parsedEndDate.getTime()) {
              throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha de fin');
            }
          }

          return {
            position,
            company_name: companyName,
            start_date: startDate,
            end_date: endDate ?? null,
          };
        })
        .filter((item): item is CandidateExperienceInput => Boolean(item));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid experiences payload');
    }
  }

  private async ensureCandidateRow(userId: string) {
    await this.prisma.$executeRaw`
      INSERT INTO "candidates" (
        "user_id",
        "dress_code",
        "collaboration_style",
        "work_pace",
        "level_of_autonomy",
        "dealing_with_management",
        "level_of_monitoring"
      )
      VALUES (
        ${userId},
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      )
      ON CONFLICT ("user_id") DO NOTHING
    `;
  }

  private async normalizeCandidateEnums(userId: string) {
    await this.prisma.$executeRaw`
      UPDATE "candidates"
      SET
        "dress_code" = CASE
          WHEN "dress_code" IS NULL OR "dress_code"::text IN ('formal', 'semi_formal', 'casual', 'indifferent')
            THEN "dress_code"
          ELSE NULL
        END,
        "collaboration_style" = CASE
          WHEN "collaboration_style" IS NULL OR "collaboration_style"::text IN ('individual', 'mixed', 'highly_collaborative', 'indifferent')
            THEN "collaboration_style"
          ELSE NULL
        END,
        "work_pace" = CASE
          WHEN "work_pace" IS NULL OR "work_pace"::text IN ('slow', 'moderate', 'accelerated', 'indifferent')
            THEN "work_pace"
          ELSE NULL
        END,
        "level_of_autonomy" = CASE
          WHEN "level_of_autonomy" IS NULL OR "level_of_autonomy"::text IN ('high_control', 'balanced', 'total_freedom', 'indifferent')
            THEN "level_of_autonomy"
          ELSE NULL
        END,
        "dealing_with_management" = CASE
          WHEN "dealing_with_management" IS NULL OR "dealing_with_management"::text IN ('strictly_professional', 'friendly_and_approachable', 'nearby', 'indifferent')
            THEN "dealing_with_management"
          ELSE NULL
        END,
        "level_of_monitoring" = CASE
          WHEN "level_of_monitoring" IS NULL OR "level_of_monitoring"::text IN ('daily_monitoring', 'frequent_monitoring', 'weekly_goals', 'biweekly_goals', 'total_trust', 'indifferent')
            THEN "level_of_monitoring"
          ELSE NULL
        END
      WHERE "user_id" = ${userId}
    `;
  }

  async findMe(userId: string) {
    await this.ensureCandidateRow(userId);
    await this.normalizeCandidateEnums(userId);

    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
    });

    if (candidate) {
      return candidate;
    }

    throw new NotFoundException(`Candidate profile for user ${userId} was not found`);
  }

  async findMeCompetenciasValores(userId: string): Promise<CandidateCompetenciasValoresResponse> {
    const candidate = await this.findMe(userId);

    const [catalogs, candidateAttributes, candidateExperiences] = await Promise.all([
      this.prisma.global_attributes.findMany({
        where: {
          type: {
            in: ['hard_skill', 'soft_skill', 'value', 'credential'],
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.candidate_attributes.findMany({
        where: { candidate_id: candidate.id },
        select: {
          global_attributes: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.candidate_experiences.findMany({
        where: { candidate_id: candidate.id },
        select: {
          position: true,
          company_name: true,
          start_date: true,
          end_date: true,
        },
      }),
    ]);

    const technicalSkillOptions = catalogs
      .filter((item) => item.type === 'hard_skill')
      .map((item) => item.name)
      .filter(Boolean);

    const softSkillOptions = catalogs
      .filter((item) => item.type === 'soft_skill')
      .map((item) => item.name)
      .filter(Boolean);

    const valueOptions = catalogs
      .filter((item) => item.type === 'value')
      .map((item) => item.name)
      .filter(Boolean);

    const credentialOptions = catalogs
      .filter((item) => item.type === 'credential')
      .map((item) => item.name)
      .filter(Boolean);

    const technicalSkills = candidateAttributes
      .map((link) => link.global_attributes)
      .filter((attribute): attribute is { name: string; type: CandidateAttributeType } =>
        Boolean(attribute?.name && attribute.type === 'hard_skill'),
      )
      .map((attribute) => attribute.name)
      .sort((a, b) => a.localeCompare(b, 'es'));

    const softSkills = candidateAttributes
      .map((link) => link.global_attributes)
      .filter((attribute): attribute is { name: string; type: CandidateAttributeType } =>
        Boolean(attribute?.name && attribute.type === 'soft_skill'),
      )
      .map((attribute) => attribute.name)
      .sort((a, b) => a.localeCompare(b, 'es'));

    const values = candidateAttributes
      .map((link) => link.global_attributes)
      .filter((attribute): attribute is { name: string; type: CandidateAttributeType } =>
        Boolean(attribute?.name && attribute.type === 'value'),
      )
      .map((attribute) => attribute.name)
      .sort((a, b) => a.localeCompare(b, 'es'));

    const credentials = candidateAttributes
      .map((link) => link.global_attributes)
      .filter((attribute): attribute is { name: string; type: CandidateAttributeType } =>
        Boolean(attribute?.name && attribute.type === 'credential'),
      )
      .map((attribute) => attribute.name)
      .sort((a, b) => a.localeCompare(b, 'es'));

    const experiences = sortCandidateExperiences(
      candidateExperiences.map((experience) => ({
        position: experience.position,
        company_name: experience.company_name,
        start_date: toDateOnlyString(experience.start_date) ?? '',
        end_date: toDateOnlyString(experience.end_date),
      })),
    );

    return {
      initialData: {
        cv_url: candidate.cv_file_url ?? '',
        behavioral_ans_1: candidate.behavioral_ans_1 ?? '',
        behavioral_ans_2: candidate.behavioral_ans_2 ?? '',
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        values,
        credentials,
        experiences,
      },
      technicalSkillOptions,
      softSkillOptions,
      valueOptions,
      credentialOptions,
    };
  }

  async updateMeCompetenciasValores(
    userId: string,
    dto: UpdateMyCompetenciasValoresDto,
    cvFileUrl?: string,
  ) {
    const candidate = await this.findMe(userId);

    const technicalSkills = this.normalizeAttributeNames(
      this.parseStringArray(dto.technical_skills, 'technical_skills'),
    );
    const softSkills = this.normalizeAttributeNames(
      this.parseStringArray(dto.soft_skills, 'soft_skills'),
    );
    const values = this.normalizeAttributeNames(this.parseStringArray(dto.values, 'values'));

    const groupedByType: Record<Exclude<CandidateAttributeType, 'credential'>, string[]> = {
      hard_skill: technicalSkills,
      soft_skill: softSkills,
      value: values,
    };

    const selectedAttributeIds: number[] = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const [type, names] of Object.entries(groupedByType) as Array<
      [CandidateAttributeType, string[]]
    >) {
      for (const name of names) {
        let attribute = await this.findGlobalAttributeByNameInsensitive(name, type);

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
            attribute = await this.findGlobalAttributeByNameInsensitive(name, type);

            if (!attribute) {
              throw error;
            }
          }
        }

        selectedAttributeIds.push(attribute.id);
      }
    }

    const uniqueSelectedAttributeIds = Array.from(new Set(selectedAttributeIds));

    const existingCvUrl = dto.cv_existing_url?.trim() || null;
    const nextCvFileUrl = cvFileUrl ?? existingCvUrl ?? candidate.cv_file_url;

    await this.prisma.$transaction([
      this.prisma.candidates.update({
        where: { id: candidate.id },
        data: {
          cv_file_url: nextCvFileUrl,
          behavioral_ans_1: dto.behavioral_ans_1.trim() || null,
          behavioral_ans_2: dto.behavioral_ans_2.trim() || null,
        },
      }),
      this.prisma.candidate_attributes.deleteMany({
        where: { candidate_id: candidate.id },
      }),
      ...(uniqueSelectedAttributeIds.length > 0
        ? [
            this.prisma.candidate_attributes.createMany({
              data: uniqueSelectedAttributeIds.map((attributeId) => ({
                candidate_id: candidate.id,
                attribute_id: attributeId,
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

    return this.findMeCompetenciasValores(userId);
  }

  async updateMeCredencialesExperiencias(
    userId: string,
    dto: UpdateMyCredencialesExperienciasDto,
  ) {
    const candidate = await this.findMe(userId);

    const credentials = this.normalizeAttributeNames(
      this.parseStringArray(dto.credentials, 'credentials'),
    );
    const experiences = sortCandidateExperiences(
      this.parseExperienceArray(dto.experiences ?? '[]').map((experience) => ({
        position: experience.position,
        company_name: experience.company_name,
        start_date: experience.start_date,
        end_date: experience.end_date,
      })),
    );

    const selectedAttributeIds: number[] = [];
    const createdAttributes: Array<{ id: number; name: string }> = [];

    for (const name of credentials) {
      let attribute = await this.findGlobalAttributeByNameInsensitive(name, 'credential');

      if (!attribute) {
        try {
          attribute = await this.prisma.global_attributes.create({
            data: {
              name,
              type: 'credential',
            },
            select: {
              id: true,
              name: true,
            },
          });

          createdAttributes.push(attribute);
        } catch (error) {
          attribute = await this.findGlobalAttributeByNameInsensitive(name, 'credential');

          if (!attribute) {
            throw error;
          }
        }
      }

      selectedAttributeIds.push(attribute.id);
    }

    const uniqueSelectedAttributeIds = Array.from(new Set(selectedAttributeIds));

    await this.prisma.$transaction([
      this.prisma.candidate_attributes.deleteMany({
        where: {
          candidate_id: candidate.id,
          global_attributes: {
            type: 'credential',
          },
        },
      }),
      this.prisma.candidate_experiences.deleteMany({
        where: { candidate_id: candidate.id },
      }),
      ...(uniqueSelectedAttributeIds.length > 0
        ? [
            this.prisma.candidate_attributes.createMany({
              data: uniqueSelectedAttributeIds.map((attributeId) => ({
                candidate_id: candidate.id,
                attribute_id: attributeId,
              })),
            }),
          ]
        : []),
      ...(experiences.length > 0
        ? [
            this.prisma.candidate_experiences.createMany({
              data: experiences.map((experience) => ({
                candidate_id: candidate.id,
                position: experience.position,
                company_name: experience.company_name,
                start_date: parseDateOnlyToDate(experience.start_date) as Date,
                end_date: experience.end_date
                  ? (parseDateOnlyToDate(experience.end_date) as Date)
                  : null,
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

    return {
      ...candidate,
      credentials,
      experiences,
    };
  }

  async updateMe(userId: string, dto: UpdateMyCandidateDto) {
    const current = await this.findMe(userId);

    const parsedBirthDate =
      dto.birth_date === undefined
        ? undefined
        : dto.birth_date === null
          ? null
          : new Date(`${dto.birth_date}T00:00:00.000Z`);

    const data = {
      ...dto,
      font_size: dto.font_size ?? current.font_size,
      birth_date: parsedBirthDate,
    };

    const updatedCandidate = await this.prisma.candidates.update({
      where: { id: current.id },
      data,
    });

    const fullName = `${updatedCandidate.name ?? ''} ${updatedCandidate.lastname ?? ''}`.trim();

    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        name: fullName || null,
        image: updatedCandidate.profile_picture ?? null,
      },
    });

    return updatedCandidate;
  }

  
	/**
	 * Create a new candidate
	 */
	async create(dto: CreateCandidateDto) {
		return this.prisma.candidates.create({
			data: dto,
		});
	}

  /**
   * Retrieve multiple candidates with pagination
   */
  async findAll(skip?: number, take?: number) {
    return this.prisma.candidates.findMany({
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        candidate_attributes: {
          select: {
            global_attributes: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        candidate_experiences: {
          select: {
            position: true,
            company_name: true,
            start_date: true,
            end_date: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve a single candidate by id
   */
  async findOne(id: number) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        candidate_attributes: {
          select: {
            global_attributes: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        candidate_experiences: {
          select: {
            position: true,
            company_name: true,
            start_date: true,
            end_date: true,
          },
        },
      },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    return candidate;
  }

  async findApplicationsByCandidateId(candidateId: number) {
    await this.findOne(candidateId);

    const applications = await this.prisma.applications.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        job_id: true,
        status: true,
        created_at: true,
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return applications.map((application) => ({
      application_id: application.id,
      offer_id: application.jobs?.id ?? application.job_id ?? 0,
      offer_title: application.jobs?.title ?? 'Oferta sin título',
      status: application.status ?? 'applied',
      created_at: application.created_at?.toISOString() ?? null,
    }));
  }

	/**
	 * Update an existing candidate by id
	 */
	async update(id: number, dto: UpdateCandidateDto) {
		await this.findOne(id);
		return this.prisma.candidates.update({
			where: { id },
			data: dto,
		});
	}

	async uploadCv(id: number, file: Express.Multer.File) {
		await this.findOne(id);
		const upload = await this.storage.uploadCandidateCv(id, file);
		await this.cvParseQueue.add('parse-cv', {
			candidate_id: id,
			storage_path: upload.path,
		});
		return this.prisma.candidates.update({
			where: { id },
			data: { cv_file_url: upload.publicUrl },
		});
	}

	/**
	 * Delete a candidate by id
	 */
	async remove(id: number) {
		await this.findOne(id);
		return this.prisma.candidates.delete({
			where: { id },
		});
	}
}
