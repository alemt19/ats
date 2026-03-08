/** @format */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmbeddingsQueueProducer } from '../../common/queues/embeddings-queue.producer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';
import { UpdateMyCompetenciasValoresDto } from './dto/competencias-valores.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageService } from '../../common/storage/storage.service';
import { CV_PARSE_QUEUE } from '../queues/queues.constants';

type CandidateAttributeType = 'hard_skill' | 'soft_skill' | 'value';

type CandidateCompetenciasValoresResponse = {
  initialData: {
    cv_url: string;
    behavioral_ans_1: string;
    behavioral_ans_2: string;
    technical_skills: string[];
    soft_skills: string[];
    values: string[];
  };
  technicalSkillOptions: string[];
  softSkillOptions: string[];
  valueOptions: string[];
};

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsQueueProducer: EmbeddingsQueueProducer,
		private readonly storage: StorageService,
		@InjectQueue(CV_PARSE_QUEUE)
		private readonly cvParseQueue: Queue,
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
          WHEN "dress_code" IS NULL OR "dress_code"::text IN ('formal', 'semi_formal', 'casual')
            THEN "dress_code"
          ELSE NULL
        END,
        "collaboration_style" = CASE
          WHEN "collaboration_style" IS NULL OR "collaboration_style"::text IN ('individual', 'mixed', 'highly_collaborative')
            THEN "collaboration_style"
          ELSE NULL
        END,
        "work_pace" = CASE
          WHEN "work_pace" IS NULL OR "work_pace"::text IN ('slow', 'moderate', 'accelerated')
            THEN "work_pace"
          ELSE NULL
        END,
        "level_of_autonomy" = CASE
          WHEN "level_of_autonomy" IS NULL OR "level_of_autonomy"::text IN ('high_control', 'balanced', 'total_freedom')
            THEN "level_of_autonomy"
          ELSE NULL
        END,
        "dealing_with_management" = CASE
          WHEN "dealing_with_management" IS NULL OR "dealing_with_management"::text IN ('strictly_professional', 'friendly_and_approachable', 'nearby')
            THEN "dealing_with_management"
          ELSE NULL
        END,
        "level_of_monitoring" = CASE
          WHEN "level_of_monitoring" IS NULL OR "level_of_monitoring"::text IN ('daily_monitoring', 'frequent_monitoring', 'weekly_goals', 'biweekly_goals', 'total_trust')
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

    const [catalogs, candidateAttributes] = await Promise.all([
      this.prisma.global_attributes.findMany({
        where: {
          type: {
            in: ['hard_skill', 'soft_skill', 'value'],
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

    return {
      initialData: {
        cv_url: candidate.cv_file_url ?? '',
        behavioral_ans_1: candidate.behavioral_ans_1 ?? '',
        behavioral_ans_2: candidate.behavioral_ans_2 ?? '',
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        values,
      },
      technicalSkillOptions,
      softSkillOptions,
      valueOptions,
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

    const groupedByType: Record<CandidateAttributeType, string[]> = {
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
      },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    return candidate;
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
