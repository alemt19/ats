/** @format */

import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JobsService } from './jobs.service';

@Controller('admin/dashboard')
@UseGuards(BetterAuthGuard)
export class AdminDashboardController {
  constructor(private readonly jobsService: JobsService) {}

  private getUserIdFromSession(session: unknown): string {
    const maybeSession = session as { user?: { id?: unknown }; id?: unknown };
    const userId = maybeSession?.user?.id ?? maybeSession?.id;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    return userId;
  }

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

  @Get()
  getDashboardData(
    @CurrentUser() session: unknown,
    @Req() request: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.jobsService.getAdminDashboardData(userId, from, to);
  }
}
