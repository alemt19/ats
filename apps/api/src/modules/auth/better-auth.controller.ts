/** @format */

import { All, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import {
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
	SignUpEmailDto,
	SignInEmailDto,
	ForgotPasswordDto,
	ResetPasswordDto,
} from './dto/auth.dto';
import { LoginSoftLockService } from './login-soft-lock.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Proxies all better-auth requests to the toNodeHandler.
 * DTOs are used purely for Swagger documentation and type contracts.
 * Runtime validation is handled internally by better-auth.
 */
@ApiTags('auth')
@Controller('auth')
export class BetterAuthController {
	constructor(
		@Inject('BETTER_AUTH')
		private readonly betterAuth: { auth: any; handler: (req: any, res: any) => any },
		private readonly loginSoftLockService: LoginSoftLockService,
		private readonly prisma: PrismaService,
	) {}

	private extractEmailFromRequest(req: Request): string | null {
		const body = req.body;

		if (body && typeof body === 'object' && typeof body.email === 'string') {
			return body.email.trim().toLowerCase();
		}

		if (typeof body === 'string') {
			try {
				const parsed = JSON.parse(body) as { email?: unknown };
				if (typeof parsed.email === 'string') {
					return parsed.email.trim().toLowerCase();
				}
			} catch {
				// no-op
			}
		}

		return null;
	}

	private isCredentialFailure(statusCode: number, body: unknown): boolean {
		if (statusCode !== 401) {
			return false;
		}

		if (!body || typeof body !== 'object') {
			return true;
		}

		const source = body as Record<string, unknown>;
		const code = typeof source.code === 'string' ? source.code.toLowerCase() : '';
		const message =
			typeof source.message === 'string' ? source.message.toLowerCase() : '';

		return (
			code.includes('invalid') ||
			code.includes('credential') ||
			message.includes('invalid') ||
			message.includes('credential') ||
			message.includes('password')
		);
	}

	private formatLockMessage(remainingSeconds: number): string {
		const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
		return `Demasiados intentos fallidos. Tu cuenta esta bloqueada temporalmente por ${minutes} minuto(s).`;
	}

	@Post('sign-up/email')
	@ApiOperation({ summary: 'Register with email and password' })
	@ApiBody({ type: SignUpEmailDto })
	@ApiResponse({ status: 200, description: 'User registered successfully' })
	@ApiResponse({ status: 422, description: 'Validation error' })
	async signUpEmail(@Req() req: Request, @Res() res: Response) {
		const signUpEmail = this.extractEmailFromRequest(req);

		if (signUpEmail) {
			const existingUser = await this.prisma.user.findUnique({
				where: { email: signUpEmail },
				select: { id: true },
			});

			if (existingUser) {
				return res.status(422).json({
					code: 'USER_ALREADY_EXISTS',
					message: 'User already exists. Use another email.',
				});
			}
		}

		return this.betterAuth.handler(req, res);
	}

	@Post('sign-in/email')
	@ApiOperation({ summary: 'Sign in with email and password' })
	@ApiBody({ type: SignInEmailDto })
	@ApiResponse({ status: 200, description: 'User signed in, session cookie set' })
	@ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
	async signInEmail(@Req() req: Request, @Res() res: Response) {
		const loginEmail = this.extractEmailFromRequest(req);

		if (loginEmail) {
			const lockStatus = await this.loginSoftLockService.getLockStatus(loginEmail);

			if (lockStatus.locked) {
				return res.status(429).json({
					code: 'LOGIN_TEMPORARILY_LOCKED',
					message: this.formatLockMessage(lockStatus.remainingSeconds),
					remainingSeconds: lockStatus.remainingSeconds,
				});
			}
		}

		let responsePayload: unknown;
		const originalJson = res.json.bind(res);
		const originalSend = res.send.bind(res);

		res.json = ((body: unknown) => {
			responsePayload = body;
			return originalJson(body);
		}) as Response['json'];

		res.send = ((body: unknown) => {
			responsePayload = body;
			return originalSend(body);
		}) as Response['send'];

		await this.betterAuth.handler(req, res);

		if (!loginEmail) {
			return;
		}

		if (res.statusCode < 400) {
			await this.loginSoftLockService.clearFailures(loginEmail);
			return;
		}

		if (this.isCredentialFailure(res.statusCode, responsePayload)) {
			await this.loginSoftLockService.registerFailure(loginEmail);
		}
	}

	@Post('sign-out')
	@ApiOperation({ summary: 'Sign out and invalidate session' })
	@ApiResponse({ status: 200, description: 'Session invalidated' })
	async signOut(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('request-password-reset')
	@ApiOperation({ summary: 'Request password reset email' })
	@ApiBody({ type: ForgotPasswordDto })
	@ApiResponse({ status: 200, description: 'Password reset email sent' })
	async forgotPassword(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('reset-password')
	@ApiOperation({ summary: 'Reset password using token from email' })
	@ApiBody({ type: ResetPasswordDto })
	@ApiResponse({ status: 200, description: 'Password updated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid or expired token' })
	async resetPassword(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	/** Catch-all for remaining better-auth routes (e.g. email verification callback) */
	@All('*')
	async handler(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}
}
