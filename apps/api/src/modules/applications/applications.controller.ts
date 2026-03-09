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
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { ApplicationsQueryDto, CreateApplicationDto, UpdateApplicationDto } from './dto/applications.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  private getUserIdFromSession(session: any): string {
    const userId = session?.user?.id ?? session?.id;
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    return userId;
  }

  private assertCandidateScope(request: Request) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      throw new UnauthorizedException('Missing candidate session cookie');
    }

    const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
    if (match?.[1] !== 'candidate') {
      throw new UnauthorizedException('Candidate session required');
    }
  }

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

  @UseGuards(BetterAuthGuard)
  @Get('me')
  findMyApplications(
    @CurrentUser() session: any,
    @Req() request: Request,
  ) {
    this.assertCandidateScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.findMyApplications(userId);
  }

  @UseGuards(BetterAuthGuard)
  @Get('me/:jobId')
  findMyApplicationByJob(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    this.assertCandidateScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.findMyApplicationByJob(userId, jobId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @Get(':id/similar-jobs')
  findSimilarJobs(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findSimilarJobs(id);
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
