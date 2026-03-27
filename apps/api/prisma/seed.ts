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
const CANDIDATE_EMAIL = 'candidato.demo@gmail.com';
const CANDIDATE_PASSWORD = 'candidato123#';
const DEFAULT_COMPANY_NAME = 'PruebaCorp';
const ADMIN_EMAIL_LOCAL_SUFFIX = '+ats-admin';
const LEGACY_ADMIN_EMAIL_PREFIX = 'admin::';
const SEED_STALE_DAYS = 21;

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

async function ensureCandidateUser(prisma: PrismaClient) {
	const user = await prisma.user.upsert({
		where: { email: CANDIDATE_EMAIL },
		update: {
			role: 'candidate',
			emailVerified: true,
			name: 'Candidato Demo',
		},
		create: {
			email: CANDIDATE_EMAIL,
			name: 'Candidato Demo',
			role: 'candidate',
			emailVerified: true,
		},
	});

	const hashedPassword = await hashPassword(CANDIDATE_PASSWORD);

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

async function ensureCandidateProfile(prisma: PrismaClient, userId: string) {
	return prisma.candidates.upsert({
		where: {
			user_id: userId,
		},
		update: {
			name: 'Candidato',
			lastname: 'Demo',
			city: 'Valencia',
			state: 'Carabobo',
			country: 'Venezuela',
		},
		create: {
			user_id: userId,
			name: 'Candidato',
			lastname: 'Demo',
			city: 'Valencia',
			state: 'Carabobo',
			country: 'Venezuela',
		},
		select: { id: true },
	});
}

async function ensureStaleSeedData(
	prisma: PrismaClient,
	params: {
		companyId: number;
		adminUserId: string;
		candidateId: number;
		candidateUserId: string;
	},
) {
	const staleDate = new Date(Date.now() - SEED_STALE_DAYS * 24 * 60 * 60 * 1000);

	const staleApplicationJob = await prisma.jobs.upsert({
		where: { id: 900001 },
		update: {
			title: 'Frontend React SSR - Seed',
			description: 'Oferta de prueba para notificaciones por postulacion estancada.',
			status: 'published',
			company_id: params.companyId,
			created_at: staleDate,
		},
		create: {
			id: 900001,
			title: 'Frontend React SSR - Seed',
			description: 'Oferta de prueba para notificaciones por postulacion estancada.',
			status: 'published',
			company_id: params.companyId,
			created_at: staleDate,
			updated_at: staleDate,
		},
		select: { id: true, title: true },
	});

	const staleNoApplicantsJob = await prisma.jobs.upsert({
		where: { id: 900002 },
		update: {
			title: 'Backend NestJS Senior - Seed',
			description: 'Oferta de prueba para notificaciones admin sin postulaciones.',
			status: 'published',
			company_id: params.companyId,
			created_at: staleDate,
		},
		create: {
			id: 900002,
			title: 'Backend NestJS Senior - Seed',
			description: 'Oferta de prueba para notificaciones admin sin postulaciones.',
			status: 'published',
			company_id: params.companyId,
			created_at: staleDate,
			updated_at: staleDate,
		},
		select: { id: true, title: true },
	});

	const staleApplication = await prisma.applications.upsert({
		where: {
			job_id_candidate_id: {
				job_id: staleApplicationJob.id,
				candidate_id: params.candidateId,
			},
		},
		update: {
			status: 'applied',
			created_at: staleDate,
		},
		create: {
			job_id: staleApplicationJob.id,
			candidate_id: params.candidateId,
			status: 'applied',
			created_at: staleDate,
			updated_at: staleDate,
		},
		select: { id: true },
	});

	await prisma.notifications.createMany({
		data: [
			{
				user_id: params.candidateUserId,
				type: 'stale_application',
				entity_type: 'application',
				entity_id: staleApplication.id,
				title: 'Tu postulacion sigue sin cambios',
				message: `Tu postulacion a ${staleApplicationJob.title} sigue en estado Postulado desde hace ${SEED_STALE_DAYS} dias.`,
				metadata: {
					seed: true,
					stale_days: SEED_STALE_DAYS,
				},
			},
			{
				user_id: params.adminUserId,
				type: 'stale_job_without_candidates',
				entity_type: 'job',
				entity_id: staleNoApplicantsJob.id,
				title: 'Oferta publicada sin postulaciones',
				message: `La oferta ${staleNoApplicantsJob.title} lleva al menos ${SEED_STALE_DAYS} dias publicada y aun no tiene postulaciones.`,
				metadata: {
					seed: true,
					stale_days: SEED_STALE_DAYS,
				},
			},
		],
		skipDuplicates: true,
	});
}

async function main() {
	const { prisma, pool } = await getPrismaClient();

	try {
		await prisma.$connect();

		const company = await ensureSingleCompany(prisma);
		const adminUser = await ensureAdminUser(prisma);
		const candidateUser = await ensureCandidateUser(prisma);
		await ensureUserAdminProfile(prisma, adminUser.id, company.id);
		const candidateProfile = await ensureCandidateProfile(prisma, candidateUser.id);
		await ensureStaleSeedData(prisma, {
			companyId: company.id,
			adminUserId: adminUser.id,
			candidateId: candidateProfile.id,
			candidateUserId: candidateUser.id,
		});

		console.log(`✅ Seed completado. Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
		console.log(`✅ Seed completado. Candidato: ${CANDIDATE_EMAIL} / ${CANDIDATE_PASSWORD}`);
		console.log(`🏢 Compañía conectada: ${company.name} (id=${company.id})`);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

void main();
