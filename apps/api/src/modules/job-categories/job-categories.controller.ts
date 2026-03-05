/** @format */

import {
	Body,
	Controller,
	Delete,
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
import { BetterAuthGuard } from '../auth/auth.guard';
import { JobCategoriesService } from './job-categories.service';
import {
	CreateJobCategoryDto,
	JobCategoriesQueryDto,
	UpdateJobCategoryDto,
} from './dto/job-categories.dto';

@Controller('admin/categorias')
@UseGuards(BetterAuthGuard)
export class JobCategoriesController {
	constructor(private readonly jobCategoriesService: JobCategoriesService) {}

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
	findAll(@Req() request: Request, @Query() query: JobCategoriesQueryDto) {
		this.assertAdminScope(request);
		return this.jobCategoriesService.findAll(query);
	}

	@Get(':id')
	findOne(@Req() request: Request, @Param('id', ParseIntPipe) id: number) {
		this.assertAdminScope(request);
		return this.jobCategoriesService.findOne(id);
	}

	@Post()
	create(@Req() request: Request, @Body() dto: CreateJobCategoryDto) {
		this.assertAdminScope(request);
		return this.jobCategoriesService.create(dto);
	}

	@Put(':id')
	update(
		@Req() request: Request,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateJobCategoryDto,
	) {
		this.assertAdminScope(request);
		return this.jobCategoriesService.update(id, dto);
	}

	@Delete(':id')
	remove(@Req() request: Request, @Param('id', ParseIntPipe) id: number) {
		this.assertAdminScope(request);
		return this.jobCategoriesService.remove(id);
	}
}
