/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto } from './dto/candidates.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

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
