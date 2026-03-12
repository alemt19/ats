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
import { AdminAuthorizationService } from '../auth/admin-authorization.service';
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
		private readonly adminAuthorizationService: AdminAuthorizationService,
		private readonly recruitersService: RecruitersService,
		private readonly supabaseStorageService: SupabaseStorageService,
	) {}

	@Get()
	async findAll(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Query() query: RecruitersQueryDto,
	) {
		const { userId } = await this.adminAuthorizationService.authorizeHeadOfRecruiters(session, request);
		return this.recruitersService.findAll(userId, query);
	}

	@Get(':id')
	async findOne(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Param('id', ParseIntPipe) recruiterId: number,
	) {
		const { userId } = await this.adminAuthorizationService.authorizeHeadOfRecruiters(session, request);
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
	async create(
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Body() dto: CreateRecruiterDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		const { userId } = await this.adminAuthorizationService.authorizeHeadOfRecruiters(session, request);
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
		@CurrentUser() session: unknown,
		@Req() request: Request,
		@Param('id', ParseIntPipe) recruiterId: number,
		@Body() dto: UpdateRecruiterDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		const { userId } = await this.adminAuthorizationService.authorizeHeadOfRecruiters(session, request);

		if (file) {
			dto.profile_picture = await this.supabaseStorageService.uploadImage(file, 'recruiters');
		}

		return this.recruitersService.update(userId, recruiterId, dto);
	}
}
