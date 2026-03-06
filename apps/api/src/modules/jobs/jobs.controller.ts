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
    return this.jobsService.listPublicOffers(dto);
  }

  @Get('catalogs')
  findCatalogs() {
    return this.jobsService.getPublicOffersCatalogs();
  }

  @Get('latest')
  findLatestPublished(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 10) : 3;
    return this.jobsService.findLatestPublishedOffers(safeLimit);
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
