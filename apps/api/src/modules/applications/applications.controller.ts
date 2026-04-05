/** @format */

import {
  BadRequestException,
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
import { ApplicationsQueryDto, CreateApplicationDto, UpdateApplicationDto, CreateApplicationFeedbackDto } from './dto/applications.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  private assertAdminScope(request: Request) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      throw new UnauthorizedException('Missing admin session cookie');
    }

    const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
    if (match?.[1] !== 'admin') {
      throw new UnauthorizedException('Admin session required');
    }
  }

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

  @UseGuards(BetterAuthGuard)
  @Post('me/:jobId/refresh')
  refreshMyApplicationByJob(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    this.assertCandidateScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.refreshMyApplicationByJob(userId, jobId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @UseGuards(BetterAuthGuard)
  @Get(':id/similar-jobs')
  findSimilarJobs(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertCandidateScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.findSimilarJobs(userId, id);
  }

  @UseGuards(BetterAuthGuard)
  @Get(':id/notes')
  findNotesForAdmin(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.findNotesForAdmin(userId, id);
  }

  @UseGuards(BetterAuthGuard)
  @Post(':id/notes')
  createNoteForAdmin(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { text?: string },
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    const text = typeof body?.text === 'string' ? body.text : '';

    if (!text.trim()) {
      throw new BadRequestException('La nota no puede estar vacía');
    }

    return this.applicationsService.createNoteForAdmin(userId, id, text);
  }

  @UseGuards(BetterAuthGuard)
  @Patch(':id/admin-status')
  updateStatusForAdmin(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string },
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    const status = typeof body?.status === 'string' ? body.status : '';

    if (!status.trim()) {
      throw new BadRequestException('El estado es requerido');
    }

    return this.applicationsService.updateStatusForAdmin(userId, id, status);
  }

  @UseGuards(BetterAuthGuard)
  @Post(':id/feedback')
  createFeedback(
    @CurrentUser() session: any,
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateApplicationFeedbackDto,
  ) {
    const cookieHeader = request.headers.cookie ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
    const scope = match?.[1] as 'admin' | 'candidate' | undefined;

    if (scope !== 'admin' && scope !== 'candidate') {
      throw new UnauthorizedException('Scope de sesión inválido');
    }

    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.createFeedback(userId, id, dto, scope);
  }

  @UseGuards(BetterAuthGuard)
  @Get('admin/feedback-stats')
  getFeedbackStats(@CurrentUser() session: any, @Req() request: Request) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.applicationsService.getFeedbackStats(userId);
  }

  @Get(':id/feedback')
  getFeedback(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getFeedback(id);
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
