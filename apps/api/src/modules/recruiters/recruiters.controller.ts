/** @format */

import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UploadedFile,
	UnauthorizedException,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
	CreateRecruiterDto,
	RecruitersQueryDto,
	UpdateRecruiterDto,
} from './dto/recruiters.dto';
import { RecruitersService } from './recruiters.service';

@Controller('admin/reclutadores')
@UseGuards(BetterAuthGuard)
export class RecruitersController {
	constructor(
		private readonly recruitersService: RecruitersService,
		private readonly supabaseStorageService: SupabaseStorageService,
	) {}

	private getUserIdFromSession(session: any): string {
		const userId = session?.user?.id ?? session?.id;
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
		@CurrentUser() session: any,
		@Req() request: Request,
		@Query() query: RecruitersQueryDto,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.recruitersService.findAll(userId, query);
	}

	@Get(':id')
	findOne(
		@CurrentUser() session: any,
		@Req() request: Request,
		@Param('id', ParseIntPipe) recruiterId: number,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.recruitersService.findOne(userId, recruiterId);
	}

	@Post()
	@UseInterceptors(FileInterceptor('profile_picture', {
		storage: memoryStorage(),
		limits: {
			fileSize: 5 * 1024 * 1024,
		},
		fileFilter: (
			_req: Request,
			file: Express.Multer.File,
			callback: (error: Error | null, acceptFile: boolean) => void,
		) => {
			if (!file.mimetype?.startsWith('image/')) {
				return callback(new BadRequestException('Only image files are allowed'), false);
			}

			callback(null, true);
		},
	}))
	create(
		@CurrentUser() session: any,
		@Req() request: Request,
		@Body() dto: CreateRecruiterDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.handleCreate(userId, dto, file);
	}

	private async handleCreate(
		userId: string,
		dto: CreateRecruiterDto,
		file?: Express.Multer.File,
	) {
		if (file) {
			dto.profile_picture = await this.supabaseStorageService.uploadImage(file, 'recruiters');
		}

		return this.recruitersService.create(userId, dto);
	}

	@Put(':id')
	@UseInterceptors(FileInterceptor('profile_picture', {
		storage: memoryStorage(),
		limits: {
			fileSize: 5 * 1024 * 1024,
		},
		fileFilter: (
			_req: Request,
			file: Express.Multer.File,
			callback: (error: Error | null, acceptFile: boolean) => void,
		) => {
			if (!file.mimetype?.startsWith('image/')) {
				return callback(new BadRequestException('Only image files are allowed'), false);
			}

			callback(null, true);
		},
	}))
	async update(
		@CurrentUser() session: any,
		@Req() request: Request,
		@Param('id', ParseIntPipe) recruiterId: number,
		@Body() dto: UpdateRecruiterDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);

		if (file) {
			dto.profile_picture = await this.supabaseStorageService.uploadImage(file, 'recruiters');
		}

		return this.recruitersService.update(userId, recruiterId, dto);
	}
}
