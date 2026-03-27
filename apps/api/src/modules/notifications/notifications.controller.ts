/** @format */

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(BetterAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private getUserIdFromSession(session: unknown): string {
    const maybeSession = session as { user?: { id?: unknown }; id?: unknown };
    const userId = maybeSession?.user?.id ?? maybeSession?.id;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    return userId;
  }

  @Get('me')
  findMyNotifications(
    @CurrentUser() session: unknown,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserIdFromSession(session);
    const parsedLimit = Number(limit);

    return this.notificationsService.findMyNotifications(
      userId,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() session: unknown,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getUserIdFromSession(session);
    return this.notificationsService.markAsRead(userId, id);
  }
}
