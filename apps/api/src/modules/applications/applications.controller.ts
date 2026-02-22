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
import { ApplicationsService } from './applications.service';
import { ApplicationsQueryDto, CreateApplicationDto, UpdateApplicationDto } from './dto/applications.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(dto);
  }

  @Get()
  findAll(@Query() dto: ApplicationsQueryDto) {
    const { skip, take, job_id: jobId, candidate_id: candidateId } = dto;
    return this.applicationsService.findAll(
      skip,
      take,
      jobId,
      candidateId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApplicationDto) {
    return this.applicationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
