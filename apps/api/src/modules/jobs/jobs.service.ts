/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/jobs.dto';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new job
   */
  async create(dto: CreateJobDto) {
    return this.prisma.jobs.create({
      data: dto,
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
