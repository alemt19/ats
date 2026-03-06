/** @format */

import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CreateAdminOfferDto } from './dto/jobs.dto';
import { JobsService } from './jobs.service';

@Controller('admin/ofertas')
@UseGuards(BetterAuthGuard)
export class AdminOffersController {
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

  @Post()
  create(@CurrentUser() session: unknown, @Req() request: Request, @Body() dto: CreateAdminOfferDto) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
    return this.jobsService.createAdminOffer(userId, dto);
  }
}
