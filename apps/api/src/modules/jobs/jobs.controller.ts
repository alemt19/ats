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
import { JobsService } from './jobs.service';
import { CreateJobDto, JobsQueryDto, UpdateJobDto } from './dto/jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  findAll(@Query() dto: JobsQueryDto) {
    return this.jobsService.listPublicOffers(dto);
  }

  @UseGuards(BetterAuthGuard)
  @Get('me')
  findAllForCandidate(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Query() dto: JobsQueryDto,
  ) {
    this.assertCandidateScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.jobsService.listPublicOffers(dto, userId);
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
