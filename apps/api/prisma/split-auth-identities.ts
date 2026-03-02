/** @format */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

const ADMIN_EMAIL_LOCAL_SUFFIX = '+ats-admin';
const LEGACY_ADMIN_EMAIL_PREFIX = 'admin::';

function splitEmail(email: string) {
	const atIndex = email.lastIndexOf('@');
	if (atIndex <= 0 || atIndex >= email.length - 1) {
		return null;
	}

	return {
		local: email.slice(0, atIndex),
		domain: email.slice(atIndex + 1),
	};
}

function toPublicEmail(email: string) {
	if (email.startsWith(LEGACY_ADMIN_EMAIL_PREFIX)) {
		return email.slice(LEGACY_ADMIN_EMAIL_PREFIX.length);
	}

	const parts = splitEmail(email);
	if (!parts) {
		return email;
	}

	if (!parts.local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)) {
		return email;
	}

	return `${parts.local.slice(0, -ADMIN_EMAIL_LOCAL_SUFFIX.length)}@${parts.domain}`;
}

function toAdminScopedEmail(email: string) {
	const publicEmail = toPublicEmail(email).toLowerCase();
	const parts = splitEmail(publicEmail);
	if (!parts) {
		return publicEmail;
	}

	if (parts.local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)) {
		return `${parts.local}@${parts.domain}`;
	}

	return `${parts.local}${ADMIN_EMAIL_LOCAL_SUFFIX}@${parts.domain}`;
}

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')];

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

async function getPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not defined');
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const adapter = new PrismaPg(pool);
	const prisma = new PrismaClient({ adapter });

	return { prisma, pool };
}

async function ensureCredentialForUser(
	prisma: PrismaClient,
	sourceUserId: string,
	targetUserId: string,
) {
	const credentialAccount = await prisma.account.findFirst({
		where: {
			userId: sourceUserId,
			providerId: 'credential',
		},
	});

	if (!credentialAccount) {
		return;
	}

	const existingCredentialOnTarget = await prisma.account.findUnique({
		where: {
			providerId_accountId: {
				providerId: 'credential',
				accountId: targetUserId,
			},
		},
	});

	if (existingCredentialOnTarget) {
		await prisma.account.update({
			where: { id: existingCredentialOnTarget.id },
			data: {
				password: credentialAccount.password,
				provider: 'credential',
				providerAccountId: targetUserId,
			},
		});
		return;
	}

	await prisma.account.create({
		data: {
			id: `acc_${randomUUID()}`,
			userId: targetUserId,
			providerId: 'credential',
			accountId: targetUserId,
			provider: 'credential',
			providerAccountId: targetUserId,
			password: credentialAccount.password,
		},
	});
}

async function main() {
	const { prisma, pool } = await getPrismaClient();

	try {
		await prisma.$connect();

		const adminProfiles = await prisma.user_admin.findMany({
			where: {
				user_id: {
					not: null,
				},
			},
			include: {
				user: true,
			},
		});

		let migrated = 0;
		let alreadyScoped = 0;
		let skippedNoEmail = 0;

		for (const adminProfile of adminProfiles) {
			const linkedUser = adminProfile.user;
			if (!linkedUser || !linkedUser.email) {
				skippedNoEmail += 1;
				continue;
			}

			const scopedEmail = toAdminScopedEmail(linkedUser.email);

			if (linkedUser.email === scopedEmail) {
				alreadyScoped += 1;
				continue;
			}

			const candidateProfile = await prisma.candidates.findUnique({
				where: { user_id: linkedUser.id },
				select: { id: true },
			});

			const scopedUser = await prisma.user.findUnique({
				where: { email: scopedEmail },
				select: { id: true },
			});

			if (candidateProfile) {
				let targetAdminUserId = scopedUser?.id;

				if (!targetAdminUserId) {
					const createdAdminUser = await prisma.user.create({
						data: {
							email: scopedEmail,
							name: linkedUser.name,
							emailVerified: linkedUser.emailVerified,
							image: linkedUser.image,
							role: 'admin',
						},
						select: { id: true },
					});

					targetAdminUserId = createdAdminUser.id;
				}

				await ensureCredentialForUser(prisma, linkedUser.id, targetAdminUserId);

				await prisma.user_admin.update({
					where: { id: adminProfile.id },
					data: { user_id: targetAdminUserId },
				});

				migrated += 1;
				continue;
			}

			if (scopedUser && scopedUser.id !== linkedUser.id) {
				await ensureCredentialForUser(prisma, linkedUser.id, scopedUser.id);
				await prisma.user_admin.update({
					where: { id: adminProfile.id },
					data: { user_id: scopedUser.id },
				});
				migrated += 1;
				continue;
			}

			await prisma.user.update({
				where: { id: linkedUser.id },
				data: {
					email: scopedEmail,
					role: 'admin',
				},
			});
			migrated += 1;
		}

		console.log(`✅ Admin auth identities migrated: ${migrated}`);
		console.log(`ℹ️ Already scoped admin identities: ${alreadyScoped}`);
		console.log(`ℹ️ Skipped admin profiles without email: ${skippedNoEmail}`);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

void main();
