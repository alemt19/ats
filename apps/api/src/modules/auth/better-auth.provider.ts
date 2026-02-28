/** @format */

import { Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

const buildLink = (path: string, token: string) => {
	const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
	return `${appUrl}${path}?token=${encodeURIComponent(token)}`;
};

const sendEmail = async (
	mailer: MailerService,
	options: { to: string; subject: string; html: string },
) => {
	const from = process.env.SMTP_FROM ?? 'no-reply@example.com';

	await mailer.sendMail({
		from,
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
};

/**
 * Provider that initializes Better-Auth with Prisma adapter and email/password.
 * Exposes both the auth instance and a Node-compatible handler.
 */
export const BetterAuthProvider: Provider = {
	provide: 'BETTER_AUTH',
	useFactory: async (prisma: PrismaService, mailer: MailerService) => {
		const baseURL =
			process.env.BETTER_AUTH_BASE_URL ??
			'http://localhost:4000/api/auth';
		const secret = process.env.BETTER_AUTH_SECRET ?? 'change-me';

		const adapter = prismaAdapter(prisma, {
			provider: 'postgresql',
		});

		const auth = betterAuth({
			baseURL,
			secret,
			adapter,
			trustedOrigins: [
				process.env.APP_URL ?? 'http://localhost:3000',
			],
			emailAndPassword: {
				enabled: true,
				requireEmailVerification: true,
				resetPasswordTokenExpiresIn: 60 * 60,
				sendResetPassword: async ({ user, token }: any) => {
					if (!user?.email) {
						return;
					}
					const resetLink = buildLink('/auth/reset', token);
					await sendEmail(mailer, {
						to: user.email,
						subject: 'Reset your password',
						html: `<p>Reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
					});
				},
			},
			emailVerification: {
				sendOnSignUp: true,
				sendOnSignIn: true,
				expiresIn: 60 * 60,
				sendVerificationEmail: async ({ user, token }: any) => {
					if (!user?.email) {
						return;
					}
					const verifyLink = buildLink('/auth/verify', token);
					try {
						await sendEmail(mailer, {
							to: user.email,
							subject: 'Verify your email',
							html: `<p>Verify your email:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`,
						});
						console.log(`[Auth] Verification email sent to ${user.email}`);
					} catch (err) {
						console.error(`[Auth] Failed to send verification email to ${user.email}:`, err);
					}
				},
			},
		});

		return {
			auth,
			handler: toNodeHandler(auth),
		};
	},
	inject: [PrismaService, MailerService],
};
