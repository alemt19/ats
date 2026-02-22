/** @format */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto, JobsQueryDto, UpdateJobDto } from './dto/jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  findAll(@Query() dto: JobsQueryDto) {
    const { skip, take, company_id: companyId, status } = dto;
    return this.jobsService.findAll(
      skip,
      take,
      companyId,
      status,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(id);
  }
}
