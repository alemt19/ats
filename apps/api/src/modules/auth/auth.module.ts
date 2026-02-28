/** @format */

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { BetterAuthController } from './better-auth.controller';
import { BetterAuthProvider } from './better-auth.provider';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
	imports: [
		PrismaModule,
		MailerModule.forRootAsync({
			useFactory: () => ({
				transport: {
					host: process.env.SMTP_HOST,
					port: Number(process.env.SMTP_PORT ?? 587),
					secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				},
				defaults: {
					from: process.env.SMTP_FROM ?? 'no-reply@example.com',
				},
			}),
		}),
	],
	controllers: [AuthController, BetterAuthController],
	providers: [BetterAuthProvider],
	exports: [BetterAuthProvider],
})
export class AuthModule {}
