/** @format */

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { BetterAuthController } from './better-auth.controller';
import { BetterAuthProvider } from './better-auth.provider';
import { BetterAuthGuard } from './auth.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../common/storage/storage.module';
import { AdminProfileController } from './admin-profile.controller';
import { AdminAuthorizationService } from './admin-authorization.service';
import { AdminProfileService } from './admin-profile.service';

@Module({
	imports: [
		PrismaModule,
		StorageModule,
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
	controllers: [AuthController, BetterAuthController, AdminProfileController],
	providers: [BetterAuthProvider, BetterAuthGuard, AdminAuthorizationService, AdminProfileService],
	exports: [BetterAuthProvider, BetterAuthGuard, AdminAuthorizationService],
})
export class AuthModule {}
