/** @format */

import {
	BadRequestException,
	Controller,
	Get,
	Put,
	Req,
	UnauthorizedException,
	UploadedFile,
	UseGuards,
	UseInterceptors,
	Body,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BetterAuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';
import { AdminProfileService } from './admin-profile.service';
import { UpdateAdminProfileDto } from './dto/admin-profile.dto';

@Controller('admin/mi-perfil')
@UseGuards(BetterAuthGuard)
export class AdminProfileController {
	constructor(
		private readonly adminProfileService: AdminProfileService,
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
	getProfile(@CurrentUser() session: any, @Req() request: Request) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		return this.adminProfileService.getProfile(userId);
	}

	@Put()
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
	async updateProfile(
		@CurrentUser() session: any,
		@Req() request: Request,
		@Body() dto: UpdateAdminProfileDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);

		const profilePictureUrl = file
			? await this.supabaseStorageService.uploadImage(file, 'recruiters')
			: undefined;

		return this.adminProfileService.updateProfile(userId, dto, profilePictureUrl);
	}
}
