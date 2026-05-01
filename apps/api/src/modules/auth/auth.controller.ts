/** @format */

import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Patch,
	Post,
	Req,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { BetterAuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { toPublicEmail } from './auth-email-scope';
import { UpdateFontSizeDto } from './dto/admin-profile.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly prisma: PrismaService) {}

	private getUserIdFromSession(session: any): string {
		const userId = session?.user?.id ?? session?.id;
		if (!userId || typeof userId !== 'string') {
			throw new UnauthorizedException('Invalid authenticated user');
		}

		return userId;
	}

	private getScopeFromCookie(request: Request): 'admin' | 'candidate' | null {
		const cookieHeader = request.headers.cookie;
		if (!cookieHeader) {
			return null;
		}

		const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
		if (!match) {
			return null;
		}

		return match[1] as 'admin' | 'candidate';
	}

	@UseGuards(BetterAuthGuard)
	@Get('access/admin')
	async getAdminAccess(@CurrentUser() session: any, @Req() request: Request) {
		const userId = this.getUserIdFromSession(session);
		const currentScope = this.getScopeFromCookie(request);

		if (currentScope !== 'admin') {
			throw new ForbiddenException('Admin session required');
		}

		let adminProfile: {
			id: number;
			role: string | null;
			name: string | null;
			lastname: string | null;
			profile_picture: string | null;
			font_size?: string | null;
			user: { email: string | null } | null;
		} | null = null;

		try {
			adminProfile = await this.prisma.user_admin.findUnique({
				where: { user_id: userId },
				select: {
					id: true,
					role: true,
					name: true,
					lastname: true,
					profile_picture: true,
					font_size: true,
					user: {
						select: {
							email: true,
						},
					},
				},
			});
		} catch {
			adminProfile = await this.prisma.user_admin.findUnique({
				where: { user_id: userId },
				select: {
					id: true,
					role: true,
					name: true,
					lastname: true,
					profile_picture: true,
					user: {
						select: {
							email: true,
						},
					},
				},
			});
		}

		if (!adminProfile) {
			throw new ForbiddenException('Admin access required');
		}

		return {
			ok: true,
			userId,
			adminRole: adminProfile.role,
			adminProfile: {
				id: adminProfile.id,
				name: adminProfile.name,
				lastname: adminProfile.lastname,
				email: adminProfile.user?.email
					? toPublicEmail(adminProfile.user.email)
					: null,
				profile_picture: adminProfile.profile_picture,
				role: adminProfile.role,
				font_size: adminProfile.font_size ?? null,
			},
		};
	}

	@UseGuards(BetterAuthGuard)
	@Get('access/candidate')
	async getCandidateAccess(@CurrentUser() session: any, @Req() request: Request) {
		const userId = this.getUserIdFromSession(session);
		const currentScope = this.getScopeFromCookie(request);
		if (currentScope !== 'candidate') {
			throw new ForbiddenException('Candidate session required');
		}

		let candidateProfile: {
			id: number;
			name: string | null;
			lastname: string | null;
			profile_picture: string | null;
			font_size?: string | null;
		} | null = null;

		try {
			candidateProfile = await this.prisma.candidates.findUnique({
				where: { user_id: userId },
				select: {
					id: true,
					name: true,
					lastname: true,
					profile_picture: true,
					font_size: true,
				},
			});
		} catch {
			candidateProfile = await this.prisma.candidates.findUnique({
				where: { user_id: userId },
				select: {
					id: true,
					name: true,
					lastname: true,
					profile_picture: true,
				},
			});
		}
		
		if (!candidateProfile) {
			throw new ForbiddenException('Candidate access required');
		}
		return {
			ok: true,
			userId,
			candidateProfile: {
				...candidateProfile,
				font_size: candidateProfile.font_size ?? null,
			},
		};
	}

	@UseGuards(BetterAuthGuard)
	@Patch('font-size')
	async updateFontSize(
		@CurrentUser() session: any,
		@Req() request: Request,
		@Body() dto: UpdateFontSizeDto,
	) {
		const userId = this.getUserIdFromSession(session);
		const currentScope = this.getScopeFromCookie(request);

		if (!currentScope) {
			throw new ForbiddenException('Session scope required');
		}

		if (currentScope === 'admin') {
			const adminProfile = await this.prisma.user_admin.findUnique({
				where: { user_id: userId },
				select: { id: true },
			});

			if (!adminProfile) {
				throw new ForbiddenException('Admin access required');
			}

			const updated = await this.prisma.user_admin.update({
				where: { id: adminProfile.id },
				data: { font_size: dto.font_size },
				select: { font_size: true },
			});

			return { font_size: updated.font_size };
		}

		const candidateProfile = await this.prisma.candidates.findUnique({
			where: { user_id: userId },
			select: { id: true },
		});

		if (!candidateProfile) {
			throw new ForbiddenException('Candidate access required');
		}

		const updated = await this.prisma.candidates.update({
			where: { id: candidateProfile.id },
			data: { font_size: dto.font_size },
			select: { font_size: true },
		});

		return { font_size: updated.font_size };
	}

	@Post('login')
	login(@Body() body: LoginDto) {
		return {
			userId: 'user_123',
			email: body.email,
			token: 'demo-token',
		};
	}
}
