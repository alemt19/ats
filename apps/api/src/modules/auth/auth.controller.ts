/** @format */

import {
	Body,
	Controller,
	ForbiddenException,
	Get,
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

		const adminProfile = await this.prisma.user_admin.findUnique({
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

		const candidateProfile = await this.prisma.candidates.findUnique({
			where: { user_id: userId },
			select: {
				id: true,
				name: true,
				lastname: true,
				profile_picture: true,
			},
		});
		
		if (!candidateProfile) {
			throw new ForbiddenException('Candidate access required');
		}
		return {
			ok: true,
			userId,
			candidateProfile,
		};
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
