/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const candidate = await this.prisma.candidates.findUnique({
      where: { user_id: userId },
    });

    if (candidate) {
      return candidate;
    }

    return this.prisma.candidates.create({
      data: { user_id: userId },
    });
  }

  async updateMe(userId: string, dto: UpdateMyCandidateDto) {
    const current = await this.findMe(userId);
    const updatedCandidate = await this.prisma.candidates.update({
      where: { id: current.id },
      data: dto,
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
