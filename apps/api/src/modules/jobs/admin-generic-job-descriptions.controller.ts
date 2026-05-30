/** @format */

import {
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { BetterAuthGuard } from '../auth/auth.guard';
import {
	CreateGenericJobDescriptionDto,
	GenericJobDescriptionsQueryDto,
} from './dto/jobs.dto';
import { JobsService } from './jobs.service';

@Controller('admin/descripciones-ofertas')
@UseGuards(BetterAuthGuard)
export class AdminGenericJobDescriptionsController {
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
	findAll(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Query() query: GenericJobDescriptionsQueryDto,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.jobsService.listAdminGenericJobDescriptions(userId, query);
	}

	@Post()
	create(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Body() dto: CreateGenericJobDescriptionDto,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.jobsService.createAdminGenericJobDescription(userId, dto);
	}

	@Get(':id')
	findOne(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Param('id', ParseIntPipe) id: number,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.jobsService.getAdminGenericJobDescription(userId, id);
	}

	@Put(':id')
	update(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: CreateGenericJobDescriptionDto,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.jobsService.updateAdminGenericJobDescription(userId, id, dto);
	}
}