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
	) {}

	@Post('sign-up/email')
	@ApiOperation({ summary: 'Register with email and password' })
	@ApiBody({ type: SignUpEmailDto })
	@ApiResponse({ status: 200, description: 'User registered successfully' })
	@ApiResponse({ status: 422, description: 'Validation error' })
	async signUpEmail(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('sign-in/email')
	@ApiOperation({ summary: 'Sign in with email and password' })
	@ApiBody({ type: SignInEmailDto })
	@ApiResponse({ status: 200, description: 'User signed in, session cookie set' })
	@ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
	async signInEmail(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('sign-out')
	@ApiOperation({ summary: 'Sign out and invalidate session' })
	@ApiResponse({ status: 200, description: 'Session invalidated' })
	async signOut(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('forget-password')
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
