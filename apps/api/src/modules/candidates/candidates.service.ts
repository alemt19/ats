/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

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
    });
  }

  /**
   * Retrieve a single candidate by id
   */
  async findOne(id: number) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { id },
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
