/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/applications.dto';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new application
   */
  async create(dto: CreateApplicationDto) {
    return this.prisma.applications.create({
      data: dto,
    });
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
}
