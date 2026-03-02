/** @format */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')];

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

const ADMIN_EMAIL = 'alejandrojalvarezg.2005@gmail.com';
const ADMIN_PASSWORD = 'admin123#';
const DEFAULT_COMPANY_NAME = 'PruebaCorp';
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

async function ensureSingleCompany(prisma: PrismaClient) {
	const existingCompany = await prisma.companies.findFirst({
		orderBy: { id: 'asc' },
	});

	if (existingCompany) {
		return existingCompany;
	}

	return prisma.companies.create({
		data: {
			name: DEFAULT_COMPANY_NAME,
		},
	});
}

async function ensureAdminUser(prisma: PrismaClient) {
	const scopedAdminEmail = toAdminScopedEmail(ADMIN_EMAIL);

	const user = await prisma.user.upsert({
		where: { email: scopedAdminEmail },
		update: {
			role: 'admin',
			emailVerified: true,
		},
		create: {
			email: scopedAdminEmail,
			name: 'Alejandro',
			role: 'admin',
			emailVerified: true,
		},
	});

	const hashedPassword = await hashPassword(ADMIN_PASSWORD);

	await prisma.account.upsert({
		where: {
			providerId_accountId: {
				providerId: 'credential',
				accountId: user.id,
			},
		},
		update: {
			password: hashedPassword,
			provider: 'credential',
			providerAccountId: user.id,
		},
		create: {
			userId: user.id,
			providerId: 'credential',
			accountId: user.id,
			provider: 'credential',
			providerAccountId: user.id,
			password: hashedPassword,
		},
	});

	return user;
}

async function ensureUserAdminProfile(prisma: PrismaClient, userId: string, companyId: number) {
	await prisma.user_admin.upsert({
		where: {
			user_id: userId,
		},
		update: {
			company_id: companyId,
			name: 'Alejandro',
			lastname: 'Alvarez',
			role: 'head_of_recruiters',
		},
		create: {
			user_id: userId,
			company_id: companyId,
			name: 'Alejandro',
			lastname: 'Alvarez',
			role: 'head_of_recruiters',
		},
	});
}

async function main() {
	const { prisma, pool } = await getPrismaClient();

	try {
		await prisma.$connect();

		const company = await ensureSingleCompany(prisma);
		const adminUser = await ensureAdminUser(prisma);
		await ensureUserAdminProfile(prisma, adminUser.id, company.id);

		console.log(`✅ Seed completado. Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
		console.log(`🏢 Compañía conectada: ${company.name} (id=${company.id})`);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

void main();
