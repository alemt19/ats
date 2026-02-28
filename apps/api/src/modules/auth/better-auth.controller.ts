/** @format */

import { All, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import {
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

@ApiTags('auth')
@Controller('api/auth')
export class BetterAuthController {
	constructor(
		@Inject('BETTER_AUTH')
		private readonly betterAuth: { auth: any; handler: (req: any, res: any) => any },
	) {}

	@Post('sign-up/email')
	@ApiOperation({ summary: 'Register with email and password' })
	@ApiConsumes('application/json', 'application/x-www-form-urlencoded')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['name', 'email', 'password'],
			properties: {
				name: { type: 'string' },
				email: { type: 'string' },
				password: { type: 'string' },
				image: { type: 'string' },
				callbackURL: { type: 'string' },
				rememberMe: { type: 'boolean' },
			},
		},
	})
	@ApiResponse({ status: 200, description: 'User registered' })
	async signUpEmail(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('sign-in/email')
	@ApiOperation({ summary: 'Sign in with email and password' })
	@ApiConsumes('application/json', 'application/x-www-form-urlencoded')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['email', 'password'],
			properties: {
				email: { type: 'string' },
				password: { type: 'string' },
				callbackURL: { type: 'string' },
				rememberMe: { type: 'boolean' },
			},
		},
	})
	@ApiResponse({ status: 200, description: 'User signed in' })
	async signInEmail(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@Post('forgot-password/email')
	@ApiOperation({ summary: 'Request password recovery email' })
	@ApiConsumes('application/json', 'application/x-www-form-urlencoded')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['email'],
			properties: {
				email: { type: 'string' },
				callbackURL: { type: 'string' },
			},
		},
	})
	@ApiResponse({ status: 200, description: 'Password reset request accepted' })
	async forgotPasswordEmail(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}

	@All('*')
	async handler(@Req() req: Request, @Res() res: Response) {
		return this.betterAuth.handler(req, res);
	}
}
