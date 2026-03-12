import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_ROLE_HEAD_OF_RECRUITERS } from './admin-roles';

@Injectable()
export class AdminAuthorizationService {
	constructor(private readonly prisma: PrismaService) {}

	getUserIdFromSession(session: unknown): string {
		const maybeSession = session as { user?: { id?: unknown }; id?: unknown };
		const userId = maybeSession?.user?.id ?? maybeSession?.id;

		if (!userId || typeof userId !== 'string') {
			throw new UnauthorizedException('Invalid authenticated user');
		}

		return userId;
	}

	assertAdminScope(request: Request) {
		const cookieHeader = request.headers.cookie;
		if (!cookieHeader) {
			throw new UnauthorizedException('Missing admin session cookie');
		}

		const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
		if (match?.[1] !== 'admin') {
			throw new UnauthorizedException('Admin session required');
		}
	}

	async getAdminRole(userId: string): Promise<string> {
		const adminProfile = await this.prisma.user_admin.findUnique({
			where: { user_id: userId },
			select: { role: true },
		});

		if (!adminProfile) {
			throw new ForbiddenException('Admin access required');
		}

		return (adminProfile.role ?? '').trim();
	}

	async authorizeAdminRequest(
		session: unknown,
		request: Request,
		allowedRoles?: readonly string[],
	) {
		this.assertAdminScope(request);
		const userId = this.getUserIdFromSession(session);
		const role = await this.getAdminRole(userId);

		if (allowedRoles?.length && !allowedRoles.includes(role)) {
			throw new ForbiddenException('Insufficient admin role');
		}

		return {
			userId,
			role,
		};
	}

	authorizeHeadOfRecruiters(session: unknown, request: Request) {
		return this.authorizeAdminRequest(session, request, [ADMIN_ROLE_HEAD_OF_RECRUITERS]);
	}
}