/** @format */
// @ts-nocheck

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';

type AttrType = 'hard_skill' | 'soft_skill' | 'value';

type CompanyData = {
	id: number;
	logo_file?: string;
	name: string;
	contact_email?: string;
	country?: string;
	state?: string;
	city?: string;
	address?: string;
	description?: string;
	mision?: string;
	vision?: string;
	values?: string;
	dress_code?: string;
	collaboration_style?: string;
	work_pace?: string;
	level_of_autonomy?: string;
	dealing_with_management?: string;
	level_of_monitoring?: string;
};

type RecruiterData = {
	email: string;
	password?: string;
	name?: string;
	lastname?: string;
	role?: string;
	phone?: string;
	company_id?: number;
	city?: string;
	state?: string;
	country?: string;
	birth_date?: string;
	dni?: string;
};

type CategoryData = {
	id: number;
	name: string;
};

type JobData = {
	id: number;
	title: string;
	position?: string;
	description: string;
	hard_skills?: string[];
	soft_skills?: string[];
	status?: string;
	salary?: string;
	state?: string;
	city?: string;
	address?: string;
	workplace_type?: string;
	employment_type?: string;
	weight_technical?: number;
	weight_soft?: number;
	weight_culture?: number;
	category_id?: number;
	company_id?: number;
};

type CandidateData = {
	id: number;
	email?: string;
	password?: string;
	name?: string;
	lastname?: string;
	dni?: string;
	phone?: string;
	country?: string;
	state?: string;
	city?: string;
	address?: string;
	birth_date?: string;
	cv_file?: string;
	behavioral_ans_1?: string;
	behavioral_ans_2?: string;
	hard_skills?: string[];
	soft_skills?: string[];
	values?: string[];
	dress_code?: string;
	collaboration_style?: string;
	work_pace?: string;
	level_of_autonomy?: string;
	dealing_with_management?: string;
	level_of_monitoring?: string;
};

type ApplicationData = {
	job_id: number;
	candidate_id: number;
};

type LoadedData = {
	company: CompanyData;
	recruiters: RecruiterData[];
	categories: CategoryData[];
	jobs: JobData[];
	candidates: CandidateData[];
	applications: ApplicationData[];
};

const ADMIN_EMAIL_LOCAL_SUFFIX = '+ats-admin';
const DEFAULT_PASSWORD = 'demo1234#';

const DRESS_CODE_VALUES = ['formal', 'semi_formal', 'casual', 'indifferent'] as const;
const COLLABORATION_STYLE_VALUES = ['individual', 'mixed', 'highly_collaborative', 'indifferent'] as const;
const WORK_PACE_VALUES = ['slow', 'moderate', 'accelerated', 'indifferent'] as const;
const LEVEL_OF_AUTONOMY_VALUES = ['high_control', 'balanced', 'total_freedom', 'indifferent'] as const;
const MANAGEMENT_STYLE_VALUES = [
	'strictly_professional',
	'friendly_and_approachable',
	'nearby',
	'indifferent',
] as const;
const MONITORING_VALUES = [
	'daily_monitoring',
	'frequent_monitoring',
	'weekly_goals',
	'biweekly_goals',
	'total_trust',
	'indifferent',
] as const;
const WORKPLACE_VALUES = ['onsite', 'hybrid', 'remote'] as const;
const EMPLOYMENT_VALUES = ['full_time', 'part_time', 'contract', 'internship'] as const;
const JOB_STATUS_VALUES = ['draft', 'published', 'closed', 'archived'] as const;
const DEFAULT_BUCKET = 'ats-files';

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')];
for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

function detectProjectRoot(): string {
	const candidates = [resolve(process.cwd()), resolve(process.cwd(), '..', '..')];
	for (const candidate of candidates) {
		if (existsSync(resolve(candidate, 'apps/api/prisma/data'))) {
			return candidate;
		}
	}
	return resolve(process.cwd());
}

const PROJECT_ROOT = detectProjectRoot();

function readJsonFile<T>(pathFromRoot: string): T {
	const absolute = resolve(PROJECT_ROOT, pathFromRoot);
	if (!existsSync(absolute)) {
		throw new Error(`No se encontro archivo JSON: ${absolute}`);
	}
	const raw = readFileSync(absolute, 'utf8');
	return JSON.parse(raw) as T;
}

function filePathFromProjectRoot(input?: string | null): string | null {
	if (!input) return null;
	const normalized = input.trim().replace(/^\/+/, '');
	if (!normalized) return null;
	const absolute = resolve(PROJECT_ROOT, normalized);
	if (!existsSync(absolute)) {
		console.warn(`  ! Archivo referenciado no existe: ${absolute}`);
	}
	return absolute;
}

function parseBirthDate(value?: string): Date | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	return date;
}

function resolveExtension(filePath: string, fallback = 'bin'): string {
	const normalized = filePath.trim();
	const dot = normalized.lastIndexOf('.');
	if (dot >= 0 && dot < normalized.length - 1) {
		return normalized.slice(dot + 1).toLowerCase();
	}
	return fallback;
}

function inferContentType(filePath: string): string {
	const ext = resolveExtension(filePath, '').toLowerCase();
	if (ext === 'pdf') return 'application/pdf';
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
	if (ext === 'png') return 'image/png';
	if (ext === 'webp') return 'image/webp';
	return 'application/octet-stream';
}

async function uploadLocalFileToStorage(params: {
	localPath: string;
	folder: string;
	ownerId: number;
	defaultExt?: string;
}): Promise<{ publicUrl: string; path: string }> {
	const { localPath, folder, ownerId, defaultExt } = params;
	if (!existsSync(localPath)) {
		throw new Error(`Archivo local no existe para subida: ${localPath}`);
	}

	const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
	const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
	if (!supabaseUrl || !supabaseKey) {
		throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos para subir archivos');
	}

	const bucket = (process.env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_BUCKET).trim();
	const client = createClient(supabaseUrl, supabaseKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const extension = resolveExtension(localPath, defaultExt ?? 'bin');
	const filename = `${Date.now()}-${randomUUID()}.${extension}`;
	const path = `${folder}/${ownerId}/${filename}`;
	const fileBuffer = readFileSync(localPath);

	const { error } = await client.storage.from(bucket).upload(path, fileBuffer, {
		contentType: inferContentType(localPath),
		upsert: true,
	});

	if (error) {
		if (error.message.includes('Unexpected token') && error.message.includes('<')) {
			throw new Error(
				[
					'Storage upload failed: Supabase devolvio HTML en vez de JSON.',
					`URL usada: ${supabaseUrl}`,
					`Bucket usado: ${bucket}`,
					'Esto suele pasar por URL incorrecta, key de otro proyecto, o proxy/VPN devolviendo una pagina HTML.',
					`Detalle tecnico: ${error.message}`,
				].join(' '),
			);
		}
		throw new Error(`Storage upload failed: ${error.message}`);
	}

	const { data } = client.storage.from(bucket).getPublicUrl(path);
	if (!data?.publicUrl) {
		throw new Error('No se pudo resolver URL publica en Supabase Storage');
	}

	return { publicUrl: data.publicUrl, path };
}

function normalizeEnumValue<T extends readonly string[]>(
	input: string | undefined,
	allowed: T,
	fallback: T[number],
): T[number] {
	if (!input) return fallback;
	const clean = input.trim();
	if ((allowed as readonly string[]).includes(clean)) return clean as T[number];
	if (clean === 'weekly_goalssaul' && (allowed as readonly string[]).includes('weekly_goals')) {
		return 'weekly_goals' as T[number];
	}
	return fallback;
}

const normalizeDressCode = (input?: string) =>
	normalizeEnumValue(input, DRESS_CODE_VALUES, 'indifferent');

const normalizeCollaborationStyle = (input?: string) =>
	normalizeEnumValue(input, COLLABORATION_STYLE_VALUES, 'indifferent');

const normalizeWorkPace = (input?: string) =>
	normalizeEnumValue(input, WORK_PACE_VALUES, 'indifferent');

const normalizeAutonomy = (input?: string) =>
	normalizeEnumValue(input, LEVEL_OF_AUTONOMY_VALUES, 'indifferent');

const normalizeManagementStyle = (input?: string) =>
	normalizeEnumValue(input, MANAGEMENT_STYLE_VALUES, 'indifferent');

const normalizeMonitoring = (input?: string) =>
	normalizeEnumValue(input, MONITORING_VALUES, 'indifferent');

const normalizeWorkplace = (input?: string) =>
	normalizeEnumValue(input, WORKPLACE_VALUES, 'onsite');

const normalizeEmployment = (input?: string) =>
	normalizeEnumValue(input, EMPLOYMENT_VALUES, 'full_time');

const normalizeJobStatus = (input?: string) =>
	normalizeEnumValue(input, JOB_STATUS_VALUES, 'draft');

function safeName(value: string | undefined, fallback: string): string {
	const clean = value?.trim();
	return clean && clean.length > 0 ? clean : fallback;
}

function safeEmail(value: string | undefined, fallbackLocal: string): string {
	const clean = value?.trim().toLowerCase();
	if (clean && clean.includes('@')) return clean;
	return `${fallbackLocal}@seed.local`;
}

function toAdminScopedEmail(email: string): string {
	const atIndex = email.lastIndexOf('@');
	if (atIndex <= 0) return email;
	const local = email.slice(0, atIndex);
	const domain = email.slice(atIndex + 1);
	if (local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)) return email;
	return `${local}${ADMIN_EMAIL_LOCAL_SUFFIX}@${domain}`;
}

function splitCompanyValues(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

async function getPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL no esta definida');
	const pool = new Pool({ connectionString: databaseUrl });
	const adapter = new PrismaPg(pool);
	const prisma = new PrismaClient({ adapter });
	return { prisma, pool };
}

async function upsertUserWithAccount(
	prisma: PrismaClient,
	email: string,
	name: string,
	role: 'admin' | 'candidate',
	password: string,
): Promise<string> {
	const user = await prisma.user.upsert({
		where: { email },
		update: { role, emailVerified: true, name },
		create: { email, name, role, emailVerified: true },
	});

	const hashedPassword = await hashPassword(password);
	await prisma.account.upsert({
		where: { providerId_accountId: { providerId: 'credential', accountId: user.id } },
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

	return user.id;
}

function loadData(): LoadedData {
	return {
		company: readJsonFile<CompanyData>('apps/api/prisma/data/companie/companie.json'),
		recruiters: readJsonFile<RecruiterData[]>('apps/api/prisma/data/recruiters/recruiters.json'),
		categories: readJsonFile<CategoryData[]>('apps/api/prisma/data/categories/categories.json'),
		jobs: readJsonFile<JobData[]>('apps/api/prisma/data/jobs/jobs.json'),
		candidates: readJsonFile<CandidateData[]>('apps/api/prisma/data/candidates/candidates.json'),
		applications: readJsonFile<ApplicationData[]>('apps/api/prisma/data/applications/application.json'),
	};
}

async function seedCategories(
	prisma: PrismaClient,
	categories: CategoryData[],
): Promise<Map<number, number>> {
	const map = new Map<number, number>();

	for (const category of categories) {
		const name = category.name.trim();
		let found = await prisma.job_categories.findFirst({ where: { name } });
		if (!found) {
			found = await prisma.job_categories.create({ data: { name } });
		}
		map.set(category.id, found.id);
	}

	console.log(`  ✓ Categorias: ${categories.length}`);
	return map;
}

async function seedGlobalAttributes(
	prisma: PrismaClient,
	jobs: JobData[],
	candidates: CandidateData[],
	companyValues: string[],
): Promise<Map<string, number>> {
	const hard = new Set<string>();
	const soft = new Set<string>();
	const values = new Set<string>();

	for (const job of jobs) {
		for (const item of job.hard_skills ?? []) hard.add(item.trim());
		for (const item of job.soft_skills ?? []) soft.add(item.trim());
	}

	for (const candidate of candidates) {
		for (const item of candidate.hard_skills ?? []) hard.add(item.trim());
		for (const item of candidate.soft_skills ?? []) soft.add(item.trim());
		for (const item of candidate.values ?? []) values.add(item.trim());
	}

	for (const item of companyValues) values.add(item.trim());

	const toCreate = [
		...Array.from(hard).filter(Boolean).map((name) => ({ name, type: 'hard_skill' as const })),
		...Array.from(soft).filter(Boolean).map((name) => ({ name, type: 'soft_skill' as const })),
		...Array.from(values).filter(Boolean).map((name) => ({ name, type: 'value' as const })),
	];

	if (toCreate.length > 0) {
		await prisma.global_attributes.createMany({ data: toCreate, skipDuplicates: true });
	}

	const all = await prisma.global_attributes.findMany({
		where: {
			OR: [
				{ type: 'hard_skill', name: { in: Array.from(hard) } },
				{ type: 'soft_skill', name: { in: Array.from(soft) } },
				{ type: 'value', name: { in: Array.from(values) } },
			],
		},
		select: { id: true, name: true, type: true },
	});

	const map = new Map<string, number>();
	for (const row of all) {
		if (row.type) map.set(`${row.type}:${row.name}`, row.id);
	}

	console.log(
		`  ✓ Atributos globales: ${toCreate.length} potenciales (${hard.size} hard, ${soft.size} soft, ${values.size} values)`,
	);

	return map;
}

function resolveAttrIds(attrMap: Map<string, number>, type: AttrType, names: string[]): number[] {
	const ids: number[] = [];
	for (const rawName of names) {
		const name = rawName.trim();
		if (!name) continue;
		const id = attrMap.get(`${type}:${name}`);
		if (!id) {
			throw new Error(`No se encontro atributo ${type}:${name}`);
		}
		ids.push(id);
	}
	return ids;
}

async function seedCompany(
	prisma: PrismaClient,
	company: CompanyData,
	companyValues: string[],
	attrMap: Map<string, number>,
): Promise<number> {
	const existing = await prisma.companies.findFirst({
		where: {
			OR: [
				...(company.contact_email ? [{ contact_email: company.contact_email }] : []),
				{ name: company.name },
			],
		},
		select: { id: true },
	});

	const data = {
		name: company.name,
		logo_url: null,
		description: company.description,
		mision: company.mision,
		dress_code: normalizeDressCode(company.dress_code),
		colaboration_style: normalizeCollaborationStyle(company.collaboration_style),
		work_pace: normalizeWorkPace(company.work_pace),
		level_of_autonomy: normalizeAutonomy(company.level_of_autonomy),
		dealing_with_management: normalizeManagementStyle(company.dealing_with_management),
		level_of_monitoring: normalizeMonitoring(company.level_of_monitoring),
		address: company.address,
		city: company.city,
		state: company.state,
		country: company.country,
		contact_email: company.contact_email,
	};

	const dbCompany = existing
		? await prisma.companies.update({ where: { id: existing.id }, data, select: { id: true, name: true } })
		: await prisma.companies.create({ data, select: { id: true, name: true } });

	const logoLocalPath = filePathFromProjectRoot(company.logo_file);
	if (logoLocalPath && existsSync(logoLocalPath)) {
		const logoUpload = await uploadLocalFileToStorage({
			localPath: logoLocalPath,
			folder: 'company-logos',
			ownerId: dbCompany.id,
		});
		await prisma.companies.update({
			where: { id: dbCompany.id },
			data: { logo_url: logoUpload.publicUrl },
		});
	}

	const valueAttrIds = resolveAttrIds(attrMap, 'value', companyValues);
	if (valueAttrIds.length > 0) {
		const existingRelations: Array<{ attribute_id: number | null }> = await prisma.company_attributes.findMany({
			where: { company_id: dbCompany.id },
			select: { attribute_id: true },
		});
		const existingSet = new Set<number>();
		for (const row of existingRelations) {
			if (row.attribute_id) existingSet.add(row.attribute_id);
		}
		const toCreate = valueAttrIds
			.filter((attributeId) => !existingSet.has(attributeId))
			.map((attribute_id) => ({ company_id: dbCompany.id, attribute_id }));
		if (toCreate.length > 0) {
			await prisma.company_attributes.createMany({ data: toCreate });
		}
	}

	console.log(`  ✓ Empresa: ${dbCompany.name} (id=${dbCompany.id})`);
	return dbCompany.id;
}

async function seedRecruiters(
	prisma: PrismaClient,
	recruiters: RecruiterData[],
	companyMap: Map<number, number>,
): Promise<number> {
	let count = 0;

	for (let i = 0; i < recruiters.length; i++) {
		const recruiter = recruiters[i]!;
		const email = toAdminScopedEmail(safeEmail(recruiter.email, `seed2-recruiter-${i + 1}`));
		const name = safeName(recruiter.name, `Recruiter${i + 1}`);
		const lastname = safeName(recruiter.lastname, 'Seed');
		const userId = await upsertUserWithAccount(
			prisma,
			email,
			`${name} ${lastname}`,
			'admin',
			recruiter.password?.trim() || DEFAULT_PASSWORD,
		);

		const logicalCompanyId = recruiter.company_id ?? 1;
		const companyId = companyMap.get(logicalCompanyId);
		if (!companyId) {
			throw new Error(`No se encontro company_id logico ${logicalCompanyId} en recruiters.json`);
		}

		await prisma.user_admin.upsert({
			where: { user_id: userId },
			update: {
				company_id: companyId,
				name,
				lastname,
				role: recruiter.role ?? 'recruiter',
				phone: recruiter.phone,
				city: recruiter.city,
				state: recruiter.state,
				country: recruiter.country,
				birth_date: parseBirthDate(recruiter.birth_date),
				dni: recruiter.dni,
			},
			create: {
				user_id: userId,
				company_id: companyId,
				name,
				lastname,
				role: recruiter.role ?? 'recruiter',
				phone: recruiter.phone,
				city: recruiter.city,
				state: recruiter.state,
				country: recruiter.country,
				birth_date: parseBirthDate(recruiter.birth_date),
				dni: recruiter.dni,
			},
		});

		count++;
	}

	console.log(`  ✓ Reclutadores: ${count}`);
	return count;
}

async function seedJobs(
	prisma: PrismaClient,
	jobs: JobData[],
	companyMap: Map<number, number>,
	categoryMap: Map<number, number>,
	attrMap: Map<string, number>,
): Promise<Map<number, number>> {
	const jobMap = new Map<number, number>();

	for (const job of jobs) {
		const logicalCompanyId = job.company_id ?? 1;
		const companyId = companyMap.get(logicalCompanyId);
		if (!companyId) {
			throw new Error(`No se encontro company_id logico ${logicalCompanyId} en jobs.json`);
		}

		const categoryId = job.category_id ? categoryMap.get(job.category_id) : undefined;
		if (!categoryId) {
			throw new Error(`No se encontro category_id logico ${job.category_id ?? -1} para job "${job.title}"`);
		}

		const hardSkillIds = resolveAttrIds(attrMap, 'hard_skill', job.hard_skills ?? []);
		const softSkillIds = resolveAttrIds(attrMap, 'soft_skill', job.soft_skills ?? []);
		const data = {
			company_id: companyId,
			category_id: categoryId,
			title: job.title,
			position: job.position,
			description: job.description,
			status: normalizeJobStatus(job.status),
			salary: job.salary,
			state: job.state,
			city: job.city,
			address: job.address,
			workplace_type: normalizeWorkplace(job.workplace_type),
			employment_type: normalizeEmployment(job.employment_type),
			weight_technical: job.weight_technical ?? 0.4,
			weight_soft: job.weight_soft ?? 0.3,
			weight_culture: job.weight_culture ?? 0.3,
		};

		const existing = await prisma.jobs.findFirst({
			where: { company_id: companyId, title: job.title },
			select: { id: true },
		});

		const dbJob = existing
			? await prisma.jobs.update({ where: { id: existing.id }, data, select: { id: true } })
			: await prisma.jobs.create({ data, select: { id: true } });

		const jobAttributeRows = [
			...hardSkillIds.map((attribute_id) => ({ job_id: dbJob.id, attribute_id, is_mandatory: false })),
			...softSkillIds.map((attribute_id) => ({ job_id: dbJob.id, attribute_id, is_mandatory: false })),
		];
		if (jobAttributeRows.length > 0) {
			await prisma.job_attributes.createMany({ data: jobAttributeRows, skipDuplicates: true });
		}

		jobMap.set(job.id, dbJob.id);
	}

	console.log(`  ✓ Jobs: ${jobs.length}`);
	return jobMap;
}

async function seedCandidates(
	prisma: PrismaClient,
	candidates: CandidateData[],
	attrMap: Map<string, number>,
): Promise<Map<number, number>> {
	const map = new Map<number, number>();

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i]!;
		const email = safeEmail(candidate.email, `seed2-candidate-${i + 1}`);
		const name = safeName(candidate.name, `Candidate${i + 1}`);
		const lastname = safeName(candidate.lastname, 'Seed');
		const password = candidate.password?.trim() || DEFAULT_PASSWORD;

		const userId = await upsertUserWithAccount(prisma, email, `${name} ${lastname}`, 'candidate', password);

		const candidateData = {
			user_id: userId,
			name,
			lastname,
			dni: candidate.dni,
			phone: candidate.phone,
			country: candidate.country,
			state: candidate.state,
			city: candidate.city,
			address: candidate.address,
			birth_date: parseBirthDate(candidate.birth_date),
			cv_file_url: null,
			behavioral_ans_1: candidate.behavioral_ans_1,
			behavioral_ans_2: candidate.behavioral_ans_2,
			dress_code: normalizeDressCode(candidate.dress_code),
			collaboration_style: normalizeCollaborationStyle(candidate.collaboration_style),
			work_pace: normalizeWorkPace(candidate.work_pace),
			level_of_autonomy: normalizeAutonomy(candidate.level_of_autonomy),
			dealing_with_management: normalizeManagementStyle(candidate.dealing_with_management),
			level_of_monitoring: normalizeMonitoring(candidate.level_of_monitoring),
		};

		const existing = await prisma.candidates.findFirst({ where: { user_id: userId }, select: { id: true } });
		const dbCandidate = existing
			? await prisma.candidates.update({ where: { id: existing.id }, data: candidateData, select: { id: true } })
			: await prisma.candidates.create({ data: candidateData, select: { id: true } });

		const cvLocalPath = filePathFromProjectRoot(candidate.cv_file);
		if (cvLocalPath && existsSync(cvLocalPath)) {
			const cvUpload = await uploadLocalFileToStorage({
				localPath: cvLocalPath,
				folder: 'cvs',
				ownerId: dbCandidate.id,
				defaultExt: 'pdf',
			});
			await prisma.candidates.update({
				where: { id: dbCandidate.id },
				data: { cv_file_url: cvUpload.publicUrl },
			});
		}

		const hardIds = resolveAttrIds(attrMap, 'hard_skill', candidate.hard_skills ?? []);
		const softIds = resolveAttrIds(attrMap, 'soft_skill', candidate.soft_skills ?? []);
		const valueIds = resolveAttrIds(attrMap, 'value', candidate.values ?? []);
		const allIds = Array.from(new Set([...hardIds, ...softIds, ...valueIds]));
		if (allIds.length > 0) {
			await prisma.candidate_attributes.createMany({
				data: allIds.map((attribute_id) => ({ candidate_id: dbCandidate.id, attribute_id })),
				skipDuplicates: true,
			});
		}

		map.set(candidate.id, dbCandidate.id);
	}

	console.log(`  ✓ Candidatos: ${candidates.length}`);
	return map;
}

async function seedApplications(
	prisma: PrismaClient,
	applications: ApplicationData[],
	jobMap: Map<number, number>,
	candidateMap: Map<number, number>,
) {
	let count = 0;

	for (const application of applications) {
		const jobId = jobMap.get(application.job_id);
		const candidateId = candidateMap.get(application.candidate_id);
		if (!jobId || !candidateId) {
			console.warn(
				`  ! Postulacion omitida por mapeo faltante (job=${application.job_id}, candidate=${application.candidate_id})`,
			);
			continue;
		}

		const dbApplication = await prisma.applications.upsert({
			where: { job_id_candidate_id: { job_id: jobId, candidate_id: candidateId } },
			update: { status: 'applied', evaluation_status: 'pending' },
			create: {
				job_id: jobId,
				candidate_id: candidateId,
				status: 'applied',
				evaluation_status: 'pending',
			},
			select: { id: true },
		});

		const existingRegister = await prisma.applications_registers.findFirst({
			where: { application_id: dbApplication.id, status: 'applied' },
			select: { id: true },
		});
		if (!existingRegister) {
			await prisma.applications_registers.create({
				data: {
					application_id: dbApplication.id,
					status: 'applied',
				},
			});
		}

		count++;
	}

	console.log(`  ✓ Postulaciones: ${count}`);
}

async function main() {
	const { prisma, pool } = await getPrismaClient();

	try {
		await prisma.$connect();
		console.log('\n🚀 Iniciando seed2 desde apps/api/prisma/data\n');

		const data = loadData();
		const companyValues = splitCompanyValues(data.company.values);

		console.log('1) Categorias...');
		const categoryMap = await seedCategories(prisma, data.categories);

		console.log('2) Atributos globales...');
		const attrMap = await seedGlobalAttributes(prisma, data.jobs, data.candidates, companyValues);

		console.log('3) Empresa...');
		const companyId = await seedCompany(prisma, data.company, companyValues, attrMap);
		const companyMap = new Map<number, number>([[data.company.id, companyId]]);

		console.log('4) Reclutadores...');
		await seedRecruiters(prisma, data.recruiters, companyMap);

		console.log('5) Jobs...');
		const jobMap = await seedJobs(prisma, data.jobs, companyMap, categoryMap, attrMap);

		console.log('6) Candidatos...');
		const candidateMap = await seedCandidates(prisma, data.candidates, attrMap);

		console.log('7) Postulaciones...');
		await seedApplications(prisma, data.applications, jobMap, candidateMap);

		console.log('\n✅ seed2 completado\n');
		console.log('Siguientes pasos recomendados:');
		console.log('  1. pnpm --filter fastapi seed:embeddings');
		console.log('  2. pnpm --filter api trigger:evaluations');
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

void main();
