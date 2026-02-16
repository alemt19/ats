/** @format */

import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
	@Post('login')
	login(@Body() body: LoginDto) {
		return {
			userId: 'user_123',
			email: body.email,
			token: 'demo-token',
		};
	}
}
