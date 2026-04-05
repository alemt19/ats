/** @format */
/**
 * SEED COMPLETO PARA DEMO DE DEFENSA DE TESIS
 *
 * Crea: 1 empresa (InnovateTech), 3 reclutadores, 8 categorías,
 *       50 global_attributes, 15 jobs, 15 candidatos con cv_text,
 *       ~33 postulaciones listas para evaluación AI.
 *
 * FLUJO COMPLETO:
 *   1. pnpm prisma:seed          → este archivo (datos estructurales)
 *   2. python generate-seed-embeddings.py  → genera embeddings via Gemini
 *   3. pnpm trigger:evaluations  → encola evaluaciones (workers FastAPI deben estar activos)
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

// ─── Cargar .env ─────────────────────────────────────────────────────────────

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')];
for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ADMIN_EMAIL_LOCAL_SUFFIX = '+ats-admin';
const SEED_STALE_DAYS = 21;
const DEFAULT_PASSWORD = 'demo1234#';

// Credenciales del equipo de reclutamiento
const RECRUITERS = [
	{
		email: 'sofia.hernandez@innovatetech.com',
		name: 'Sofía',
		lastname: 'Hernández',
		role: 'head_of_recruiters',
		phone: '+58 424-111-0001',
	},
	{
		email: 'miguel.torres@innovatetech.com',
		name: 'Miguel',
		lastname: 'Torres',
		role: 'recruiter',
		phone: '+58 424-111-0002',
	},
	{
		email: 'laura.mendez@innovatetech.com',
		name: 'Laura',
		lastname: 'Méndez',
		role: 'recruiter',
		phone: '+58 424-111-0003',
	},
];

// ─── Atributos globales ───────────────────────────────────────────────────────

const HARD_SKILLS = [
	'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL',
	'Docker', 'AWS', 'CSS/SCSS', 'Git', 'Next.js',
	'NestJS', 'FastAPI', 'MongoDB', 'Redis', 'GraphQL',
	'REST APIs', 'Power BI', 'Tableau', 'Machine Learning', 'Linux',
];

const SOFT_SKILLS = [
	'Comunicación efectiva', 'Trabajo en equipo', 'Liderazgo',
	'Pensamiento crítico', 'Adaptabilidad', 'Gestión del tiempo',
	'Resolución de problemas', 'Creatividad', 'Proactividad', 'Empatía',
	'Negociación', 'Presentación', 'Aprendizaje continuo', 'Atención al detalle',
	'Orientación a resultados', 'Manejo del estrés', 'Iniciativa',
	'Colaboración', 'Mentoría', 'Escucha activa',
];

const VALUES = [
	'Innovación', 'Integridad', 'Colaboración', 'Excelencia',
	'Responsabilidad', 'Transparencia', 'Respeto', 'Compromiso',
	'Sostenibilidad', 'Aprendizaje',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AttrMap = Record<string, number>;
type CandidateRecord = { id: number; userId: string };
type JobRecord = { id: number };

function toAdminScopedEmail(email: string): string {
	const atIndex = email.lastIndexOf('@');
	if (atIndex <= 0) return email;
	const local = email.slice(0, atIndex);
	const domain = email.slice(atIndex + 1);
	return `${local}${ADMIN_EMAIL_LOCAL_SUFFIX}@${domain}`;
}

/** Devuelve los IDs de atributos para el array de nombres dados. */
function attrs(map: AttrMap, type: 'hard_skill' | 'soft_skill' | 'value', ...names: string[]): number[] {
	return names.map((name) => {
		const id = map[`${type}:${name}`];
		if (!id) throw new Error(`Atributo no encontrado: ${type}:${name}`);
		return id;
	});
}

async function getPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL no está definida');
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
		update: { password: hashedPassword, provider: 'credential', providerAccountId: user.id },
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

// ─── PASO 1: Empresa ─────────────────────────────────────────────────────────

async function seedCompany(prisma: PrismaClient) {
	const company = await prisma.companies.upsert({
		where: { id: 1 },
		update: {
			name: 'InnovateTech C.A.',
			description:
				'Empresa venezolana de tecnología especializada en desarrollo de software a medida, ' +
				'consultoría IT y transformación digital para empresas de todos los sectores. ' +
				'Con más de 8 años en el mercado, contamos con un equipo de +50 profesionales apasionados por la innovación.',
			mision:
				'Transformar la industria tecnológica venezolana con soluciones innovadoras que impulsen ' +
				'el crecimiento de nuestros clientes y contribuyan al desarrollo del ecosistema tech nacional.',
			dress_code: 'casual',
			colaboration_style: 'mixed',
			work_pace: 'accelerated',
			level_of_autonomy: 'balanced',
			dealing_with_management: 'friendly_and_approachable',
			level_of_monitoring: 'weekly_goals',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			contact_email: 'talento@innovatetech.com',
		},
		create: {
			id: 1,
			name: 'InnovateTech C.A.',
			description:
				'Empresa venezolana de tecnología especializada en desarrollo de software a medida, ' +
				'consultoría IT y transformación digital para empresas de todos los sectores. ' +
				'Con más de 8 años en el mercado, contamos con un equipo de +50 profesionales apasionados por la innovación.',
			mision:
				'Transformar la industria tecnológica venezolana con soluciones innovadoras que impulsen ' +
				'el crecimiento de nuestros clientes y contribuyan al desarrollo del ecosistema tech nacional.',
			dress_code: 'casual',
			colaboration_style: 'mixed',
			work_pace: 'accelerated',
			level_of_autonomy: 'balanced',
			dealing_with_management: 'friendly_and_approachable',
			level_of_monitoring: 'weekly_goals',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			contact_email: 'talento@innovatetech.com',
		},
	});
	console.log(`  ✓ Empresa: ${company.name} (id=${company.id})`);
	return company;
}

// ─── PASO 2: Reclutadores ────────────────────────────────────────────────────

async function seedRecruiters(prisma: PrismaClient, companyId: number) {
	const recruiterProfiles: Array<{ id: number; userId: string; name: string }> = [];

	for (const rec of RECRUITERS) {
		const scopedEmail = toAdminScopedEmail(rec.email);
		const userId = await upsertUserWithAccount(
			prisma,
			scopedEmail,
			`${rec.name} ${rec.lastname}`,
			'admin',
			DEFAULT_PASSWORD,
		);
		const profile = await prisma.user_admin.upsert({
			where: { user_id: userId },
			update: {
				company_id: companyId,
				name: rec.name,
				lastname: rec.lastname,
				role: rec.role,
				phone: rec.phone,
				city: 'Caracas',
				state: 'Distrito Capital',
				country: 'Venezuela',
			},
			create: {
				user_id: userId,
				company_id: companyId,
				name: rec.name,
				lastname: rec.lastname,
				role: rec.role,
				phone: rec.phone,
				city: 'Caracas',
				state: 'Distrito Capital',
				country: 'Venezuela',
			},
		});
		recruiterProfiles.push({ id: profile.id, userId, name: rec.name });
	}

	console.log(`  ✓ Reclutadores: ${recruiterProfiles.map((r) => r.name).join(', ')}`);
	return recruiterProfiles;
}

// ─── PASO 3: Categorías ───────────────────────────────────────────────────────

async function seedCategories(prisma: PrismaClient) {
	const categories = [
		'Tecnología e IT',
		'Data & Analytics',
		'Diseño & UX/UI',
		'Marketing Digital',
		'Recursos Humanos',
		'Finanzas y Contabilidad',
		'Operaciones',
		'Ventas',
	];

	await prisma.job_categories.createMany({
		data: categories.map((name) => ({ name })),
		skipDuplicates: true,
	});

	const all = await prisma.job_categories.findMany({ select: { id: true, name: true } });
	const catMap: Record<string, number> = {};
	for (const c of all) {
		if (c.name) catMap[c.name] = c.id;
	}

	console.log(`  ✓ Categorías: ${categories.join(', ')}`);
	return catMap;
}

// ─── PASO 4: Global Attributes ────────────────────────────────────────────────

async function seedGlobalAttributes(prisma: PrismaClient): Promise<AttrMap> {
	const toCreate = [
		...HARD_SKILLS.map((name) => ({ name, type: 'hard_skill' as const })),
		...SOFT_SKILLS.map((name) => ({ name, type: 'soft_skill' as const })),
		...VALUES.map((name) => ({ name, type: 'value' as const })),
	];

	await prisma.global_attributes.createMany({ data: toCreate, skipDuplicates: true });

	const all = await prisma.global_attributes.findMany({ select: { id: true, name: true, type: true } });
	const map: AttrMap = {};
	for (const a of all) {
		if (a.type) map[`${a.type}:${a.name}`] = a.id;
	}

	console.log(`  ✓ Global attributes: ${toCreate.length} creados (${HARD_SKILLS.length} hard, ${SOFT_SKILLS.length} soft, ${VALUES.length} values)`);
	return map;
}

// ─── PASO 5: Company Attributes ───────────────────────────────────────────────

async function seedCompanyAttributes(prisma: PrismaClient, companyId: number, attrMap: AttrMap) {
	const valueIds = attrs(attrMap, 'value', 'Innovación', 'Excelencia', 'Colaboración', 'Responsabilidad', 'Integridad');

	await prisma.company_attributes.createMany({
		data: valueIds.map((attribute_id) => ({ company_id: companyId, attribute_id })),
		skipDuplicates: true,
	});

	console.log(`  ✓ Company attributes: ${valueIds.length} valores vinculados`);
}

// ─── PASO 6: Jobs ─────────────────────────────────────────────────────────────

async function seedJobs(
	prisma: PrismaClient,
	companyId: number,
	catMap: Record<string, number>,
	attrMap: AttrMap,
): Promise<JobRecord[]> {
	const it = catMap['Tecnología e IT']!;
	const da = catMap['Data & Analytics']!;
	const ux = catMap['Diseño & UX/UI']!;
	const mk = catMap['Marketing Digital']!;
	const hr = catMap['Recursos Humanos']!;
	const fi = catMap['Finanzas y Contabilidad']!;
	const op = catMap['Operaciones']!;
	// const vt = catMap['Ventas']!; // draft jobs

	const jobsData = [
		// ── Published ──────────────────────────────────────────────────────────
		{
			title: 'Desarrollador Frontend Senior',
			description:
				'Buscamos un Desarrollador Frontend Senior para liderar el desarrollo de interfaces de usuario modernas y escalables. ' +
				'Trabajarás con React, TypeScript y Next.js en proyectos de alto impacto para clientes de diferentes sectores. ' +
				'Responsabilidades: diseño e implementación de componentes reutilizables, colaboración con equipos de backend y diseño UX, ' +
				'optimización de rendimiento, code reviews y mentoría a desarrolladores junior. ' +
				'Se requiere mínimo 4 años de experiencia en desarrollo frontend con React.',
			status: 'published' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1200 - $1800 USD/mes',
			weight_technical: 0.5,
			weight_soft: 0.3,
			weight_culture: 0.2,
			hardSkills: ['React', 'TypeScript', 'Next.js', 'CSS/SCSS'],
			mandatoryHard: ['React', 'TypeScript'],
			softSkills: ['Comunicación efectiva', 'Creatividad', 'Atención al detalle'],
			values: ['Innovación', 'Excelencia'],
		},
		{
			title: 'Desarrollador Backend Node.js',
			description:
				'Incorporamos un Desarrollador Backend Senior con experiencia en Node.js y NestJS para construir APIs RESTful robustas y escalables. ' +
				'Trabajarás con PostgreSQL, Docker y servicios cloud. ' +
				'Responsabilidades: diseño de arquitectura de microservicios, implementación de lógica de negocio, optimización de consultas SQL, ' +
				'integración con servicios de terceros y garantía de seguridad en los endpoints. ' +
				'Valoramos experiencia con Redis, BullMQ y GraphQL.',
			status: 'published' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'remote' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1300 - $2000 USD/mes',
			weight_technical: 0.5,
			weight_soft: 0.3,
			weight_culture: 0.2,
			hardSkills: ['Node.js', 'NestJS', 'PostgreSQL', 'Docker', 'Redis'],
			mandatoryHard: ['Node.js', 'NestJS', 'PostgreSQL'],
			softSkills: ['Resolución de problemas', 'Trabajo en equipo', 'Atención al detalle'],
			values: ['Excelencia', 'Compromiso'],
		},
		{
			title: 'Analista de Datos',
			description:
				'Buscamos un Analista de Datos con sólida experiencia en Python y herramientas de Business Intelligence. ' +
				'Serás responsable de extraer, transformar y visualizar datos para apoyar decisiones estratégicas del negocio. ' +
				'Responsabilidades: desarrollo de dashboards en Power BI y Tableau, análisis exploratorio de datos, ' +
				'creación de reportes ejecutivos, colaboración con equipos de negocio y propuesta de métricas clave (KPIs). ' +
				'Se requiere dominio de SQL avanzado y experiencia con PostgreSQL.',
			status: 'published' as const,
			category_id: da,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$900 - $1400 USD/mes',
			weight_technical: 0.4,
			weight_soft: 0.3,
			weight_culture: 0.3,
			hardSkills: ['Python', 'PostgreSQL', 'Power BI', 'Tableau'],
			mandatoryHard: ['Python', 'PostgreSQL'],
			softSkills: ['Pensamiento crítico', 'Atención al detalle', 'Presentación'],
			values: ['Innovación', 'Aprendizaje'],
		},
		{
			title: 'DevOps Engineer',
			description:
				'Incorporamos un DevOps Engineer para modernizar y automatizar nuestra infraestructura cloud. ' +
				'Trabajarás con Docker, AWS y herramientas de CI/CD para garantizar la disponibilidad y escalabilidad de nuestros servicios. ' +
				'Responsabilidades: diseño e implementación de pipelines CI/CD, gestión de infraestructura como código (IaC), ' +
				'monitoreo de sistemas, gestión de contenedores con Docker/Kubernetes y optimización de costos cloud. ' +
				'Se requiere experiencia con Linux y scripting (Bash/Python).',
			status: 'published' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'remote' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1400 - $2200 USD/mes',
			weight_technical: 0.55,
			weight_soft: 0.25,
			weight_culture: 0.2,
			hardSkills: ['Docker', 'AWS', 'Linux', 'Git', 'Python'],
			mandatoryHard: ['Docker', 'AWS', 'Linux'],
			softSkills: ['Resolución de problemas', 'Gestión del tiempo', 'Adaptabilidad'],
			values: ['Responsabilidad', 'Excelencia'],
		},
		{
			title: 'Diseñador UX/UI',
			description:
				'Buscamos un Diseñador UX/UI creativo con experiencia en diseño de productos digitales centrados en el usuario. ' +
				'Trabajarás en estrecha colaboración con desarrolladores y product managers para crear experiencias excepcionales. ' +
				'Responsabilidades: investigación de usuarios, wireframing y prototipado, diseño de interfaces en alta fidelidad, ' +
				'definición de sistemas de diseño y componentes, validación de usabilidad con pruebas A/B y feedback de usuarios. ' +
				'Experiencia con CSS/SCSS para colaboración efectiva con desarrollo.',
			status: 'published' as const,
			category_id: ux,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$800 - $1200 USD/mes',
			weight_technical: 0.3,
			weight_soft: 0.4,
			weight_culture: 0.3,
			hardSkills: ['CSS/SCSS', 'REST APIs'],
			mandatoryHard: ['CSS/SCSS'],
			softSkills: ['Creatividad', 'Atención al detalle', 'Comunicación efectiva', 'Colaboración'],
			values: ['Innovación', 'Respeto'],
		},
		{
			title: 'Especialista en Marketing Digital',
			description:
				'Buscamos un Especialista en Marketing Digital para liderar nuestra estrategia de contenidos y campañas digitales. ' +
				'Responsabilidades: planificación y ejecución de campañas en redes sociales y Google Ads, análisis de métricas de rendimiento, ' +
				'gestión de contenidos para blog y RRSS, estrategia de SEO/SEM, email marketing y generación de reportes de resultados. ' +
				'Se valorará experiencia con herramientas de automatización de marketing y análisis de datos con Power BI.',
			status: 'published' as const,
			category_id: mk,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$700 - $1100 USD/mes',
			weight_technical: 0.2,
			weight_soft: 0.5,
			weight_culture: 0.3,
			hardSkills: ['REST APIs', 'Power BI'],
			mandatoryHard: [],
			softSkills: ['Comunicación efectiva', 'Creatividad', 'Presentación', 'Negociación'],
			values: ['Innovación', 'Colaboración'],
		},
		{
			title: 'Data Scientist',
			description:
				'Incorporamos un Data Scientist para diseñar y desarrollar modelos de Machine Learning que impulsen la toma de decisiones. ' +
				'Trabajarás con grandes volúmenes de datos para identificar patrones y construir soluciones predictivas. ' +
				'Responsabilidades: desarrollo de modelos ML (clasificación, regresión, clustering), feature engineering, ' +
				'experimentación y validación de modelos, despliegue en producción y comunicación de resultados a stakeholders. ' +
				'Dominio de Python (scikit-learn, TensorFlow/PyTorch) y visualización con Power BI o Tableau.',
			status: 'published' as const,
			category_id: da,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'remote' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1500 - $2500 USD/mes',
			weight_technical: 0.5,
			weight_soft: 0.25,
			weight_culture: 0.25,
			hardSkills: ['Python', 'Machine Learning', 'PostgreSQL', 'Power BI'],
			mandatoryHard: ['Python', 'Machine Learning'],
			softSkills: ['Pensamiento crítico', 'Resolución de problemas', 'Aprendizaje continuo'],
			values: ['Innovación', 'Aprendizaje'],
		},
		{
			title: 'Full Stack Developer',
			description:
				'Buscamos un Full Stack Developer para construir y mantener aplicaciones web completas en un entorno ágil. ' +
				'Trabajarás tanto en el frontend con React como en el backend con Node.js y PostgreSQL. ' +
				'Responsabilidades: desarrollo de nuevas funcionalidades end-to-end, mantenimiento y refactoring de código existente, ' +
				'colaboración con diseñadores y PMs, participación en code reviews y sprints de desarrollo ágil. ' +
				'TypeScript es indispensable tanto en frontend como en backend.',
			status: 'published' as const,
			category_id: it,
			city: 'Valencia',
			state: 'Carabobo',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$1000 - $1600 USD/mes',
			weight_technical: 0.5,
			weight_soft: 0.3,
			weight_culture: 0.2,
			hardSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
			mandatoryHard: ['React', 'Node.js', 'TypeScript'],
			softSkills: ['Resolución de problemas', 'Trabajo en equipo', 'Adaptabilidad'],
			values: ['Excelencia', 'Innovación'],
		},
		{
			title: 'Especialista en Recursos Humanos',
			description:
				'Buscamos un Especialista en RRHH con enfoque en selección de personal técnico y cultura organizacional. ' +
				'Responsabilidades: gestión del proceso de reclutamiento y selección, onboarding de nuevos empleados, ' +
				'apoyo en el desarrollo de políticas de bienestar y cultura, mediación de conflictos, ' +
				'coordinación de evaluaciones de desempeño y gestión de comunicaciones internas. ' +
				'Experiencia en empresas de tecnología es un plus significativo.',
			status: 'published' as const,
			category_id: hr,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'onsite' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$600 - $900 USD/mes',
			weight_technical: 0.1,
			weight_soft: 0.6,
			weight_culture: 0.3,
			hardSkills: ['REST APIs'],
			mandatoryHard: [],
			softSkills: ['Comunicación efectiva', 'Empatía', 'Negociación', 'Escucha activa', 'Liderazgo'],
			values: ['Respeto', 'Colaboración', 'Integridad'],
		},
		{
			title: 'Analista Financiero',
			description:
				'Incorporamos un Analista Financiero para apoyar la planificación financiera y el análisis de rentabilidad de la empresa. ' +
				'Responsabilidades: elaboración de modelos financieros, análisis de flujo de caja, reportes de gestión, ' +
				'control presupuestario, análisis de KPIs financieros y presentación de resultados a gerencia. ' +
				'Dominio de herramientas de visualización (Tableau, Power BI) y Python para automatización de reportes.',
			status: 'published' as const,
			category_id: fi,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'onsite' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$800 - $1200 USD/mes',
			weight_technical: 0.4,
			weight_soft: 0.3,
			weight_culture: 0.3,
			hardSkills: ['Python', 'PostgreSQL', 'Tableau', 'Power BI'],
			mandatoryHard: ['Tableau'],
			softSkills: ['Atención al detalle', 'Pensamiento crítico', 'Orientación a resultados'],
			values: ['Integridad', 'Responsabilidad', 'Excelencia'],
		},
		// ── Closed ─────────────────────────────────────────────────────────────
		{
			title: 'Product Manager',
			description:
				'Buscamos un Product Manager con visión estratégica para liderar el ciclo de vida de nuestros productos digitales. ' +
				'Responsabilidades: definición de roadmap de producto, gestión del backlog, coordinación entre equipos técnicos y de negocio, ' +
				'análisis de métricas de producto, facilitación de ceremonias ágiles y comunicación con stakeholders. ' +
				'Experiencia con metodologías Agile/Scrum y herramientas de gestión de producto.',
			status: 'closed' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1500 - $2000 USD/mes',
			weight_technical: 0.2,
			weight_soft: 0.5,
			weight_culture: 0.3,
			hardSkills: ['REST APIs'],
			mandatoryHard: [],
			softSkills: ['Liderazgo', 'Comunicación efectiva', 'Gestión del tiempo', 'Resolución de problemas'],
			values: ['Innovación', 'Responsabilidad'],
		},
		{
			title: 'Desarrollador Backend Python',
			description:
				'Incorporamos un Desarrollador Backend Python para construir microservicios de alta disponibilidad con FastAPI. ' +
				'Trabajarás con PostgreSQL, Redis y Docker en una arquitectura orientada a eventos. ' +
				'Responsabilidades: diseño e implementación de APIs, optimización de queries, integración con servicios de mensajería, ' +
				'escritura de tests unitarios y de integración, y participación en el proceso de code review.',
			status: 'closed' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'remote' as const,
			employment_type: 'full_time' as const,
			position: 'Senior',
			salary: '$1200 - $1900 USD/mes',
			weight_technical: 0.5,
			weight_soft: 0.3,
			weight_culture: 0.2,
			hardSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
			mandatoryHard: ['Python', 'FastAPI'],
			softSkills: ['Resolución de problemas', 'Trabajo en equipo', 'Atención al detalle'],
			values: ['Excelencia', 'Aprendizaje'],
		},
		{
			title: 'Gerente de Operaciones',
			description:
				'Buscamos un Gerente de Operaciones para supervisar y optimizar los procesos operativos de la empresa. ' +
				'Responsabilidades: gestión del equipo de operaciones, definición y monitoreo de KPIs operacionales, ' +
				'identificación de cuellos de botella y propuesta de mejoras, coordinación con equipos técnicos, ' +
				'gestión de proveedores y control presupuestario del área.',
			status: 'closed' as const,
			category_id: op,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'onsite' as const,
			employment_type: 'full_time' as const,
			position: 'Manager',
			salary: '$1500 - $2200 USD/mes',
			weight_technical: 0.2,
			weight_soft: 0.5,
			weight_culture: 0.3,
			hardSkills: ['Git'],
			mandatoryHard: [],
			softSkills: ['Liderazgo', 'Gestión del tiempo', 'Orientación a resultados', 'Resolución de problemas'],
			values: ['Responsabilidad', 'Integridad'],
		},
		// ── Draft ──────────────────────────────────────────────────────────────
		{
			title: 'Desarrollador Frontend Junior',
			description:
				'Oportunidad para desarrolladores junior que quieren dar sus primeros pasos profesionales en React y TypeScript. ' +
				'Trabajarás bajo la guía de desarrolladores senior en proyectos reales de impacto. ' +
				'Responsabilidades: implementación de componentes a partir de diseños, corrección de bugs, ' +
				'escritura de tests básicos y participación activa en code reviews. ' +
				'Se valorará proyectos personales, contribuciones open source y portfolio en GitHub.',
			status: 'draft' as const,
			category_id: it,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Junior',
			salary: '$500 - $800 USD/mes',
			weight_technical: 0.4,
			weight_soft: 0.35,
			weight_culture: 0.25,
			hardSkills: ['React', 'TypeScript', 'CSS/SCSS', 'Git'],
			mandatoryHard: ['React'],
			softSkills: ['Aprendizaje continuo', 'Trabajo en equipo', 'Adaptabilidad'],
			values: ['Aprendizaje', 'Innovación'],
		},
		{
			title: 'Especialista en Ventas B2B',
			description:
				'Buscamos un Especialista en Ventas B2B para liderar la expansión comercial de InnovateTech en nuevos mercados. ' +
				'Responsabilidades: prospección y calificación de leads, presentaciones comerciales a tomadores de decisión, ' +
				'negociación de contratos, gestión del pipeline de ventas y cumplimiento de cuotas mensuales. ' +
				'Experiencia en venta de servicios de tecnología es altamente valorada.',
			status: 'draft' as const,
			category_id: catMap['Ventas']!,
			city: 'Caracas',
			state: 'Distrito Capital',
			workplace_type: 'hybrid' as const,
			employment_type: 'full_time' as const,
			position: 'Mid-level',
			salary: '$700 - $1200 USD/mes + comisiones',
			weight_technical: 0.1,
			weight_soft: 0.6,
			weight_culture: 0.3,
			hardSkills: ['REST APIs'],
			mandatoryHard: [],
			softSkills: ['Comunicación efectiva', 'Negociación', 'Orientación a resultados', 'Presentación'],
			values: ['Compromiso', 'Integridad'],
		},
	];

	const createdJobs: JobRecord[] = [];

	for (const jobData of jobsData) {
		const { hardSkills, mandatoryHard, softSkills, values: jobValues, ...coreData } = jobData;

		const hardAttrIds = attrs(attrMap, 'hard_skill', ...hardSkills);
		const softAttrIds = attrs(attrMap, 'soft_skill', ...softSkills);
		const valueAttrIds = attrs(attrMap, 'value', ...jobValues);

		// Ensure mandatoryHard is treated as a string array for type checking
		const mandatoryHardArray = (mandatoryHard as unknown as string[]).filter((s) => !!s);

		const jobAttributes = [
			...hardAttrIds.map((id, i) => {
				const skillName = hardSkills[i];
				const isMandatory = skillName && mandatoryHardArray.includes(skillName);
				return {
					attribute_id: id,
					is_mandatory: isMandatory || false,
				};
			}),
			...softAttrIds.map((id) => ({ attribute_id: id, is_mandatory: false })),
			...valueAttrIds.map((id) => ({ attribute_id: id, is_mandatory: false })),
		];

		const job = await prisma.jobs.create({
			data: {
				...coreData,
				company_id: 1,
				job_attributes: { create: jobAttributes },
			},
			select: { id: true },
		});

		createdJobs.push(job);
	}

	console.log(`  ✓ Jobs: ${createdJobs.length} creados`);
	return createdJobs;
}

// ─── PASO 7: Candidatos ───────────────────────────────────────────────────────

async function seedCandidates(prisma: PrismaClient, attrMap: AttrMap): Promise<CandidateRecord[]> {
	const candidateData = [
		{
			email: 'ana.garcia@email.com',
			name: 'Ana',
			lastname: 'García',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-201-0001',
			dress_code: 'casual' as const,
			collaboration_style: 'mixed' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'friendly_and_approachable' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['React', 'TypeScript', 'Next.js', 'CSS/SCSS', 'Git'],
			softSkills: ['Comunicación efectiva', 'Creatividad', 'Adaptabilidad', 'Atención al detalle'],
			values: ['Innovación', 'Excelencia'],
			cv_text: `ANA GARCÍA — Desarrolladora Frontend Senior
Contacto: ana.garcia@email.com | LinkedIn: linkedin.com/in/anagarcia

EXPERIENCIA PROFESIONAL
Frontend Senior Developer – TechSolutions C.A. (2021 – presente)
Lideré la migración de una aplicación Angular legacy a React + TypeScript + Next.js con Server Side Rendering.
Rediseñé el sistema de componentes utilizando Storybook, reduciendo el tiempo de desarrollo de nuevas vistas en 40%.
Implementé estrategias de lazy loading y optimización de imágenes que mejoraron el LCP en 60%.

Frontend Developer – DigitalBase (2019 – 2021)
Desarrollé el frontend completo de un e-commerce con +200k usuarios activos (React, Redux, CSS Modules).
Integré pasarelas de pago y flujos de autenticación OAuth.

HABILIDADES
React, TypeScript, Next.js, CSS/SCSS, Git, Webpack, Jest, Storybook, Figma (consumo).
Inglés: B2 (Upper Intermediate).

EDUCACIÓN
Ingeniería en Computación – Universidad Central de Venezuela (2019)`,
			behavioral_ans_1:
				'En mi trabajo anterior tuvimos un conflicto entre el equipo de diseño y desarrollo sobre el tiempo de implementación de una nueva funcionalidad. Organicé una reunión de alineación donde ambos equipos pudieron expresar sus restricciones y logramos un compromiso que satisfizo a ambas partes, ajustando el alcance del diseño sin sacrificar la calidad técnica.',
			behavioral_ans_2:
				'Una vez entregué una funcionalidad con un bug crítico en producción que no detecté en las pruebas locales. Lo reconocí de inmediato, informé al equipo y lideré el hotfix en menos de 2 horas. Implementé pruebas de integración adicionales para ese flujo y propuse una checklist de QA previa a deploy.',
		},
		{
			email: 'carlos.perez@email.com',
			name: 'Carlos',
			lastname: 'Pérez',
			city: 'Valencia',
			state: 'Carabobo',
			country: 'Venezuela',
			phone: '+58 412-202-0002',
			dress_code: 'semi_formal' as const,
			collaboration_style: 'individual' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'total_freedom' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'biweekly_goals' as const,
			hardSkills: ['Python', 'PostgreSQL', 'Power BI', 'Tableau', 'Machine Learning'],
			softSkills: ['Pensamiento crítico', 'Atención al detalle', 'Presentación', 'Aprendizaje continuo'],
			values: ['Innovación', 'Aprendizaje', 'Excelencia'],
			cv_text: `CARLOS PÉREZ — Analista de Datos
Contacto: carlos.perez@email.com

EXPERIENCIA PROFESIONAL
Data Analyst Senior – Banco Meridiano (2020 – presente)
Desarrollé dashboards ejecutivos en Power BI conectados a PostgreSQL para seguimiento de KPIs operativos.
Automaticé reportes mensuales con Python (pandas, sqlalchemy) reduciendo 8 horas de trabajo manual semanal.
Construí modelo predictivo de churn con scikit-learn (accuracy 83%) usado por el área comercial.

Analista Junior – Consultora DataVenez (2018 – 2020)
Análisis exploratorio de datos de ventas y logística para clientes de consumo masivo.
Creación de tableros interactivos en Tableau para equipos de dirección.

HABILIDADES
Python, pandas, numpy, scikit-learn, SQL, PostgreSQL, Power BI, Tableau, Git.
Certificado: Microsoft Power BI Data Analyst Associate.

EDUCACIÓN
Ingeniería de Sistemas – Universidad de Carabobo (2018)`,
			behavioral_ans_1:
				'Tuve un conflicto con un colega sobre la metodología para limpiar un dataset. Presenté mis argumentos con evidencia técnica (comparación de resultados), escuché sus observaciones y llegamos a un enfoque híbrido que incorporaba lo mejor de ambas propuestas.',
			behavioral_ans_2:
				'Cometí un error en una fórmula de cálculo de comisiones que afectó el reporte mensual. Detecté el error antes de la presentación ejecutiva, notifiqué a mi jefe, corregí los datos y entregué el reporte correcto con 30 minutos de adelanto. Documenté el proceso para evitar recurrencia.',
		},
		{
			email: 'maria.rodriguez@email.com',
			name: 'María',
			lastname: 'Rodríguez',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-203-0003',
			dress_code: 'casual' as const,
			collaboration_style: 'mixed' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'nearby' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['React', 'Node.js', 'TypeScript', 'CSS/SCSS', 'Git'],
			softSkills: ['Trabajo en equipo', 'Adaptabilidad', 'Aprendizaje continuo', 'Resolución de problemas'],
			values: ['Colaboración', 'Aprendizaje'],
			cv_text: `MARÍA RODRÍGUEZ — Desarrolladora Full Stack
Contacto: maria.rodriguez@email.com

EXPERIENCIA PROFESIONAL
Full Stack Developer – StartupTech (2022 – presente)
Desarrollo de aplicaciones web con React (frontend) y Node.js/Express (backend).
Diseño de APIs REST y conexión con PostgreSQL.
Implementación de módulos de autenticación con JWT.

Desarrolladora Junior – Agencia Digital Creativa (2021 – 2022)
Desarrollo de landing pages y sitios web corporativos con React.
Mantenimiento de proyectos legacy en JavaScript vanilla.

HABILIDADES
React, TypeScript, Node.js, CSS/SCSS, Git, PostgreSQL (básico), REST APIs.

EDUCACIÓN
Técnico Superior en Informática – IUT (2021)
Cursos: React desde cero, Node.js avanzado (Udemy)`,
			behavioral_ans_1:
				'En un proyecto con plazos ajustados, el equipo tenía diferentes prioridades. Propuse una planificación semanal corta donde cada miembro compartía su progreso y bloqueantes, lo cual mejoró la coordinación y cumplimos el deadline.',
			behavioral_ans_2:
				'Olvidé hacer push de un hotfix crítico antes de una reunión importante. El cliente no pudo ver la corrección en vivo. Lo reconocí, hice el deploy en el momento y ofrecí una demostración adicional al día siguiente.',
		},
		{
			email: 'luis.torres@email.com',
			name: 'Luis',
			lastname: 'Torres',
			city: 'Maracay',
			state: 'Aragua',
			country: 'Venezuela',
			phone: '+58 412-204-0004',
			dress_code: 'casual' as const,
			collaboration_style: 'individual' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['Node.js', 'NestJS', 'PostgreSQL', 'Docker', 'Redis'],
			softSkills: ['Resolución de problemas', 'Atención al detalle', 'Gestión del tiempo'],
			values: ['Excelencia', 'Responsabilidad'],
			cv_text: `LUIS TORRES — Backend Developer Senior
Contacto: luis.torres@email.com

EXPERIENCIA PROFESIONAL
Backend Senior – Fintech Venezuela (2020 – presente)
Desarrollo de microservicios con NestJS para procesamiento de transacciones financieras.
Diseño de esquemas PostgreSQL optimizados y queries de alta frecuencia.
Implementación de colas de mensajería con Redis + BullMQ para procesamiento asíncrono.
Containerización con Docker y orquestación básica con Docker Compose.

Backend Developer – Empresa Logística Nacional (2018 – 2020)
APIs REST con Node.js/Express para gestión de flota y entregas.
Integración con GPS y sistemas legados vía SOAP/REST.

HABILIDADES
Node.js, NestJS, TypeScript, PostgreSQL, Redis, Docker, Git, BullMQ.

EDUCACIÓN
Ingeniería en Computación – ULA (2018)`,
			behavioral_ans_1:
				'Tuve un desacuerdo con el arquitecto de sistemas sobre el uso de Redis vs bases de datos SQL para un caso de uso específico. Preparé un análisis técnico con benchmarks y escenarios de fallo, lo presenté al equipo y finalmente optamos por la solución que mejor se adaptaba a los requisitos de latencia.',
			behavioral_ans_2:
				'Un script de migración de base de datos que desarrollé tenía un bug que corrompió datos de prueba en staging. Identifiqué el problema, restauré el backup y reescribí el script con transacciones atómicas y validaciones previas.',
		},
		{
			email: 'valeria.castro@email.com',
			name: 'Valeria',
			lastname: 'Castro',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-205-0005',
			dress_code: 'casual' as const,
			collaboration_style: 'highly_collaborative' as const,
			work_pace: 'slow' as const,
			level_of_autonomy: 'total_freedom' as const,
			dealing_with_management: 'nearby' as const,
			level_of_monitoring: 'total_trust' as const,
			hardSkills: ['CSS/SCSS', 'REST APIs', 'Git'],
			softSkills: ['Creatividad', 'Atención al detalle', 'Colaboración', 'Comunicación efectiva'],
			values: ['Innovación', 'Respeto'],
			cv_text: `VALERIA CASTRO — Diseñadora UX/UI
Contacto: valeria.castro@email.com | Portfolio: valeria.design

EXPERIENCIA PROFESIONAL
UX/UI Designer – Agencia Pixel (2021 – presente)
Diseño de interfaces para aplicaciones móviles y web (B2C y B2B).
Conducción de user research: entrevistas, encuestas, card sorting.
Creación de prototipos interactivos en Figma y validación con usuarios.
Definición y mantenimiento de design systems con componentes reutilizables.

Diseñadora Jr – Studio Creativo (2019 – 2021)
Diseño gráfico y web para clientes de retail, educación y salud.
Implementación de landing pages con HTML/CSS/SCSS.

HABILIDADES
Figma, Adobe XD, CSS/SCSS, principios de accesibilidad WCAG, Storybook (consumo), Git.

EDUCACIÓN
Diseño Gráfico – Universidad Neumann (2019)
Certificación UX Design – Google (2022)`,
			behavioral_ans_1:
				'Al presentar una propuesta de rediseño, el equipo de desarrollo rechazó varios elementos por complejidad técnica. Organicé sesiones de diseño técnico conjunto (developer-designer handoff) donde ambos revisábamos la factibilidad en tiempo real, llegando a soluciones que eran tanto estéticamente sólidas como implementables.',
			behavioral_ans_2:
				'Entregué wireframes de baja fidelidad como entregable final en lugar de los de alta fidelidad acordados. Reconocí el malentendido, trabajé el fin de semana para completar los de alta fidelidad y a partir de ese momento documenté cada entregable acordado por escrito.',
		},
		{
			email: 'diego.martinez@email.com',
			name: 'Diego',
			lastname: 'Martínez',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-206-0006',
			dress_code: 'semi_formal' as const,
			collaboration_style: 'individual' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'total_freedom' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'total_trust' as const,
			hardSkills: ['Docker', 'AWS', 'Linux', 'Git', 'Python'],
			softSkills: ['Resolución de problemas', 'Gestión del tiempo', 'Adaptabilidad', 'Iniciativa'],
			values: ['Responsabilidad', 'Excelencia'],
			cv_text: `DIEGO MARTÍNEZ — DevOps Engineer
Contacto: diego.martinez@email.com

EXPERIENCIA PROFESIONAL
DevOps Engineer – Empresa Telecomunicaciones (2019 – presente)
Diseño e implementación de pipelines CI/CD con GitHub Actions y GitLab CI.
Gestión de infraestructura AWS: EC2, RDS, S3, ECS, CloudWatch.
Containerización de aplicaciones con Docker y orquestación con ECS Fargate.
Scripting de automatización con Python y Bash para tareas operativas.
Implementación de IaC con Terraform.

Administrador de Sistemas – Empresa de Seguros (2017 – 2019)
Administración de servidores Linux (Ubuntu, CentOS).
Backups automáticos y monitoreo con Nagios.

HABILIDADES
Docker, AWS, Linux, Terraform, Python, Bash, GitHub Actions, Git, Kubernetes (básico).

EDUCACIÓN
Ingeniería de Sistemas – USB (2017). AWS Solutions Architect Associate (2021).`,
			behavioral_ans_1:
				'Tuve un conflicto con el equipo de desarrollo porque mis pipelines de CI tardaban demasiado en sus workflows. Me senté con ellos a entender sus necesidades, analicé los cuellos de botella y reduje el tiempo de pipeline de 25 a 8 minutos mediante paralelización y caching de dependencias.',
			behavioral_ans_2:
				'Cometí un error de configuración en AWS que dejó un bucket S3 accesible públicamente por 3 horas. Al detectarlo, lo corregí de inmediato, audité todos los permisos de la cuenta y propuse e implementé AWS Config Rules para detección automática de configuraciones inseguras.',
		},
		{
			email: 'sofia.lopez@email.com',
			name: 'Sofía',
			lastname: 'López',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-207-0007',
			dress_code: 'casual' as const,
			collaboration_style: 'highly_collaborative' as const,
			work_pace: 'slow' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'friendly_and_approachable' as const,
			level_of_monitoring: 'biweekly_goals' as const,
			hardSkills: ['REST APIs'],
			softSkills: ['Comunicación efectiva', 'Empatía', 'Negociación', 'Escucha activa', 'Liderazgo', 'Colaboración'],
			values: ['Respeto', 'Integridad', 'Compromiso'],
			cv_text: `SOFÍA LÓPEZ — Especialista en Recursos Humanos
Contacto: sofia.lopez@email.com

EXPERIENCIA PROFESIONAL
HR Specialist – Empresa Tecnológica Regional (2020 – presente)
Gestión completa del proceso de reclutamiento técnico: definición de perfiles, entrevistas técnicas con apoyo de líderes, ofertas y onboarding.
Implementación de programa de bienestar laboral que redujo la rotación en 25%.
Mediación en 12+ conflictos interpersonales con resolución satisfactoria.
Coordinación de evaluaciones de desempeño semestrales para 80 empleados.

Asistente de RRHH – Distribuidora Nacional (2018 – 2020)
Apoyo en nómina, contratos y gestión de expedientes.

HABILIDADES
Reclutamiento técnico, entrevistas por competencias, gestión del desempeño, HRIS, legislación laboral venezolana.

EDUCACIÓN
Licenciatura en Relaciones Industriales – UCAB (2018)`,
			behavioral_ans_1:
				'Medié un conflicto entre un desarrollador y su líder técnico sobre la distribución de tareas. Realicé reuniones individuales para entender cada perspectiva, identifiqué que el problema raíz era falta de claridad en roles, y facilité una sesión de alineación de expectativas que resolvió la situación.',
			behavioral_ans_2:
				'Cometí un error al comunicar la fecha de corte de vacaciones a todo el equipo, generando confusión. Envié una comunicación correctiva clara y rápida, me disculpé con los afectados y establecí un proceso de revisión doble para comunicados de políticas.',
		},
		{
			email: 'andres.ramirez@email.com',
			name: 'Andrés',
			lastname: 'Ramírez',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-208-0008',
			dress_code: 'casual' as const,
			collaboration_style: 'mixed' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'total_freedom' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
			softSkills: ['Resolución de problemas', 'Trabajo en equipo', 'Aprendizaje continuo', 'Atención al detalle'],
			values: ['Excelencia', 'Aprendizaje'],
			cv_text: `ANDRÉS RAMÍREZ — Backend Python Developer
Contacto: andres.ramirez@email.com

EXPERIENCIA PROFESIONAL
Backend Developer – Startup HealthTech (2021 – presente)
Desarrollo de microservicios con FastAPI para plataforma de telemedicina.
Diseño de esquemas PostgreSQL con optimización para consultas de alta frecuencia.
Implementación de colas de procesamiento asíncrono con Redis + BullMQ (Python).
Containerización con Docker y despliegue en VPS con Nginx.

Backend Jr Python – Empresa de E-learning (2019 – 2021)
APIs REST con Django REST Framework.
Integración con servicios externos (Stripe, SendGrid, Zoom).

HABILIDADES
Python, FastAPI, Django, PostgreSQL, Redis, Docker, Git, pytest, SQLAlchemy.

EDUCACIÓN
Ingeniería en Informática – UNEXPO (2019)`,
			behavioral_ans_1:
				'Tuve una diferencia técnica con un compañero sobre el uso de ORMs vs SQL crudo en un módulo crítico. Propuse hacer un spike técnico de 2 días para probar ambos enfoques en el caso real y presentar resultados al equipo, quien decidió por evidencia objetiva.',
			behavioral_ans_2:
				'Introduje un bug en producción al modificar una migración de base de datos sin considerar datos existentes. El servicio estuvo caído 15 minutos. Corregí el problema, documenté el postmortem y propuse agregar validaciones de migración en el CI.',
		},
		{
			email: 'camila.vargas@email.com',
			name: 'Camila',
			lastname: 'Vargas',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-209-0009',
			dress_code: 'casual' as const,
			collaboration_style: 'highly_collaborative' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'friendly_and_approachable' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['REST APIs', 'Power BI'],
			softSkills: ['Creatividad', 'Comunicación efectiva', 'Presentación', 'Adaptabilidad', 'Negociación'],
			values: ['Innovación', 'Colaboración'],
			cv_text: `CAMILA VARGAS — Especialista en Marketing Digital
Contacto: camila.vargas@email.com

EXPERIENCIA PROFESIONAL
Marketing Digital Specialist – Agencia 360 (2021 – presente)
Gestión de campañas SEM en Google Ads y Meta Ads con presupuestos de $5k-$20k/mes.
Elaboración de reportes de rendimiento en Power BI para clientes de retail y educación.
Estrategia de contenidos para redes sociales (Instagram, LinkedIn, TikTok).
Implementación de email marketing con Mailchimp y HubSpot.

Community Manager – Empresa de Moda (2019 – 2021)
Creación de contenido gráfico y audiovisual para RRSS.
Crecimiento de 0 a 50k seguidores en Instagram en 18 meses.

HABILIDADES
Google Ads, Meta Ads, SEO/SEM, Power BI, Mailchimp, HubSpot, Canva, WordPress.

EDUCACIÓN
Comunicación Social – UCAB (2019). Certificación Google Ads (2021).`,
			behavioral_ans_1:
				'En un proyecto con un cliente difícil que cambiaba constantemente los requerimientos, medié entre el cliente y el equipo creativo. Establecí un proceso formal de aprobación de brief antes de comenzar producción, lo que redujo las revisiones de 8 a 2 por campaña.',
			behavioral_ans_2:
				'Publiqué un post en la cuenta de un cliente con información desactualizada sobre un precio. Lo detecté a los 20 minutos, eliminé el post, publiqué la corrección y notifiqué al cliente de inmediato con un plan de acción para evitar recurrencia.',
		},
		{
			email: 'roberto.silva@email.com',
			name: 'Roberto',
			lastname: 'Silva',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-210-0010',
			dress_code: 'semi_formal' as const,
			collaboration_style: 'mixed' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'NestJS'],
			softSkills: ['Resolución de problemas', 'Trabajo en equipo', 'Mentoría', 'Liderazgo'],
			values: ['Excelencia', 'Compromiso'],
			cv_text: `ROBERTO SILVA — Full Stack Developer Senior
Contacto: roberto.silva@email.com

EXPERIENCIA PROFESIONAL
Full Stack Senior – Empresa SaaS (2019 – presente)
Arquitectura y desarrollo de plataforma SaaS con React + TypeScript (frontend) y NestJS + PostgreSQL (backend).
Liderazgo técnico de equipo de 4 desarrolladores: code reviews, definición de estándares, mentoría.
Containerización con Docker y despliegue en servidores propios con Nginx + PM2.
Migración de monolito legacy a arquitectura de módulos independientes.

Full Stack Developer – Empresa de Software (2017 – 2019)
Desarrollo de aplicaciones web con React y Node.js/Express.
Integración con APIs de terceros (pagos, mensajería, mapas).

HABILIDADES
React, TypeScript, Next.js, Node.js, NestJS, PostgreSQL, Docker, Redis, Git, Jest.

EDUCACIÓN
Ingeniería en Sistemas – UJMV (2017)`,
			behavioral_ans_1:
				'Como líder técnico, tuve que mediar cuando dos desarrolladores tenían enfoques completamente distintos para un módulo crítico. Organicé una sesión de pair programming donde ambos implementaron su enfoque en paralelo y evaluamos los trade-offs juntos, llegando a un consenso técnico documentado.',
			behavioral_ans_2:
				'Estimé mal el tiempo de un módulo complejo, afectando el sprint. Informé al PM con 3 días de anticipación, propuse reducir el alcance al MVP y recuperé el tiempo restante con horas adicionales. Desde entonces uso técnicas de estimation más conservadoras con buffers explícitos.',
		},
		{
			email: 'isabella.mora@email.com',
			name: 'Isabella',
			lastname: 'Mora',
			city: 'Valencia',
			state: 'Carabobo',
			country: 'Venezuela',
			phone: '+58 412-211-0011',
			dress_code: 'casual' as const,
			collaboration_style: 'individual' as const,
			work_pace: 'accelerated' as const,
			level_of_autonomy: 'total_freedom' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'biweekly_goals' as const,
			hardSkills: ['Python', 'Machine Learning', 'PostgreSQL', 'Power BI', 'Tableau'],
			softSkills: ['Pensamiento crítico', 'Aprendizaje continuo', 'Resolución de problemas', 'Creatividad'],
			values: ['Innovación', 'Aprendizaje'],
			cv_text: `ISABELLA MORA — Data Scientist
Contacto: isabella.mora@email.com

EXPERIENCIA PROFESIONAL
Data Scientist – Empresa Retail (2020 – presente)
Desarrollo de modelos de recomendación de productos (collaborative filtering, content-based).
Sistema de predicción de demanda con serie temporal (ARIMA, Prophet) que mejoró la planificación de inventario en 30%.
Pipeline de MLOps con versionado de modelos y monitoreo de drift.
Dashboards de métricas de negocio en Power BI y Tableau.

Analista de Datos – Consultora (2018 – 2020)
Análisis estadístico y modelos de segmentación de clientes con K-Means.
Reportes automatizados con Python.

HABILIDADES
Python (scikit-learn, TensorFlow, pandas, numpy), PostgreSQL, Power BI, Tableau, Git, MLflow.

EDUCACIÓN
Ingeniería en Sistemas – UC (2018). Especialización en Machine Learning – Coursera (2020).`,
			behavioral_ans_1:
				'El equipo de negocio quería implementar inmediatamente un modelo con accuracy del 78% que yo consideraba insuficiente. Presenté métricas adicionales (precision/recall por clase) que mostraban el riesgo real y propuse 2 semanas más para mejorarlo a 89%. El negocio aceptó.',
			behavioral_ans_2:
				'Desplegué un modelo con datos de entrenamiento mal normalizados. Las predicciones en producción eran incorrectas. Lo detecté en 4 horas, revertí al modelo anterior, corregí el pipeline de datos y re-entrené. Documenté el proceso en un postmortem.',
		},
		{
			email: 'tomas.espinoza@email.com',
			name: 'Tomás',
			lastname: 'Espinoza',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-212-0012',
			dress_code: 'formal' as const,
			collaboration_style: 'individual' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'high_control' as const,
			dealing_with_management: 'strictly_professional' as const,
			level_of_monitoring: 'daily_monitoring' as const,
			hardSkills: ['Python', 'PostgreSQL', 'Tableau', 'Power BI'],
			softSkills: ['Atención al detalle', 'Pensamiento crítico', 'Orientación a resultados', 'Gestión del tiempo'],
			values: ['Integridad', 'Responsabilidad'],
			cv_text: `TOMÁS ESPINOZA — Analista Financiero
Contacto: tomas.espinoza@email.com

EXPERIENCIA PROFESIONAL
Analista Financiero Senior – Empresa Manufacturera (2019 – presente)
Elaboración de modelos financieros para evaluación de proyectos de inversión (VPN, TIR).
Control presupuestario mensual con análisis de variaciones y proyecciones.
Automatización de reportes gerenciales con Python + Excel/Tableau.
Análisis de flujo de caja y estados financieros consolidados.

Analista Jr – Firma Auditora (2017 – 2019)
Auditoría de estados financieros, conciliaciones bancarias, gestión de cartera.

HABILIDADES
Análisis financiero, modelación financiera, Python, SQL, Power BI, Tableau, Excel avanzado.

EDUCACIÓN
Licenciatura en Contaduría Pública – UCV (2017). CPA (en proceso).`,
			behavioral_ans_1:
				'En un cierre mensual con presión de tiempo, detecté una discrepancia contable importante. Trabajé con el equipo de operaciones para identificar el origen (error de clasificación), lo corregí, documenté el ajuste y presenté el reporte con 2 horas de retraso pero completamente correcto.',
			behavioral_ans_2:
				'Proyecté incorrectamente el flujo de caja de un trimestre por no considerar un cambio en política de cobros. El error fue detectado en revisión antes de presentar a gerencia. Corregí el modelo, documenté el supuesto errado y añadí una sección de supuestos explícitos a todos mis modelos.',
		},
		{
			email: 'gabriela.fuentes@email.com',
			name: 'Gabriela',
			lastname: 'Fuentes',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-213-0013',
			dress_code: 'casual' as const,
			collaboration_style: 'highly_collaborative' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'nearby' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['REST APIs'],
			softSkills: ['Liderazgo', 'Comunicación efectiva', 'Gestión del tiempo', 'Creatividad', 'Negociación'],
			values: ['Innovación', 'Responsabilidad', 'Colaboración'],
			cv_text: `GABRIELA FUENTES — Product Manager
Contacto: gabriela.fuentes@email.com

EXPERIENCIA PROFESIONAL
Product Manager – Plataforma de E-commerce (2020 – presente)
Gestión del roadmap de producto digital con +80k usuarios activos.
Coordinación entre equipos de diseño, desarrollo y negocio (equipo de 12 personas).
Priorización de backlog con marcos OKR y Value vs Effort.
Lanzamiento de 3 features principales que incrementaron la conversión en 18%.

Project Manager – Agencia Digital (2018 – 2020)
Gestión de proyectos web y móviles para clientes de diferentes industrias.
Facilitación de ceremonias Scrum y gestión de stakeholders.

HABILIDADES
Gestión de producto, Scrum/Agile, OKRs, Jira, Figma (consumo), análisis de métricas, comunicación ejecutiva.

EDUCACIÓN
Administración de Empresas – USB (2018). Product Management – Product School (2021).`,
			behavioral_ans_1:
				'El equipo de desarrollo resistía una funcionalidad que el negocio requería urgentemente. Organicé una sesión de discovery donde ambas partes explicaron sus restricciones, redefinimos el alcance técnicamente viable y entregamos un MVP en 2 semanas que cumplió el objetivo de negocio.',
			behavioral_ans_2:
				'Lancé una feature sin comunicar adecuadamente a soporte al cliente, generando un pico de tickets. Hice un mapa de impacto post-lanzamiento, preparé material de soporte retroactivo y establecí un checklist de lanzamiento que incluye siempre al equipo de soporte.',
		},
		{
			email: 'sebastian.morales@email.com',
			name: 'Sebastián',
			lastname: 'Morales',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-214-0014',
			dress_code: 'casual' as const,
			collaboration_style: 'mixed' as const,
			work_pace: 'slow' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'friendly_and_approachable' as const,
			level_of_monitoring: 'weekly_goals' as const,
			hardSkills: ['React', 'TypeScript', 'CSS/SCSS', 'Git'],
			softSkills: ['Aprendizaje continuo', 'Trabajo en equipo', 'Adaptabilidad', 'Creatividad'],
			values: ['Aprendizaje', 'Innovación'],
			cv_text: `SEBASTIÁN MORALES — Desarrollador Frontend Junior
Contacto: sebastian.morales@email.com | GitHub: github.com/sebastiandev

EXPERIENCIA
Desarrollador Frontend Freelance (2023 – presente)
Desarrollo de sitios web y landing pages para pequeñas empresas con React y TypeScript.
3 proyectos personales publicados en producción: blog personal, app de gestión de tareas, calculadora financiera.

Pasantía – Agencia Web Local (2022 – 2023)
Apoyo en mantenimiento de sitios WordPress y páginas estáticas.
Primeros pasos con React en proyectos de práctica.

HABILIDADES
React, TypeScript, CSS/SCSS, Git, HTML5, JavaScript, Vite, básico de Node.js.

EDUCACIÓN
Ingeniería en Computación – UCV (en curso, 5to año).
Cursos: React + TypeScript (Frontend Masters), CSS Avanzado (Platzi).`,
			behavioral_ans_1:
				'En un proyecto freelance, el cliente quería cambios de último momento que afectaban el diseño completo. Escuché sus necesidades, evalué el impacto técnico y propuse una solución intermedia que resolvía su preocupación sin rehacer todo el trabajo. El cliente quedó satisfecho.',
			behavioral_ans_2:
				'En mi pasantía, subí código con un bug a staging sin avisar. El equipo descubrió el problema en una demo. Aprendí a siempre probar localmente antes de hacer push y a comunicar cualquier cambio al equipo antes de subir.',
		},
		{
			email: 'laura.jimenez@email.com',
			name: 'Laura',
			lastname: 'Jiménez',
			city: 'Caracas',
			state: 'Distrito Capital',
			country: 'Venezuela',
			phone: '+58 412-215-0015',
			dress_code: 'casual' as const,
			collaboration_style: 'highly_collaborative' as const,
			work_pace: 'moderate' as const,
			level_of_autonomy: 'balanced' as const,
			dealing_with_management: 'friendly_and_approachable' as const,
			level_of_monitoring: 'biweekly_goals' as const,
			hardSkills: [],
			softSkills: ['Comunicación efectiva', 'Empatía', 'Negociación', 'Orientación a resultados', 'Escucha activa'],
			values: ['Respeto', 'Colaboración', 'Compromiso'],
			cv_text: `LAURA JIMÉNEZ — Ejecutiva de Ventas B2B / RRHH
Contacto: laura.jimenez@email.com

EXPERIENCIA PROFESIONAL
Ejecutiva de Ventas B2B – Empresa de Software (2021 – presente)
Gestión de cartera de 30+ clientes corporativos con ticket promedio de $8k.
Cumplimiento de cuotas de ventas en 110% los últimos 4 trimestres consecutivos.
Negociación de contratos anuales con empresas de banca, retail y manufactura.
Prospección activa mediante LinkedIn Sales Navigator y cold outreach.

Asesora de RRHH – Consultora (2019 – 2021)
Reclutamiento para posiciones de ventas y atención al cliente.
Aplicación de entrevistas por competencias.

HABILIDADES
Ventas consultivas, negociación, CRM (HubSpot, Salesforce), entrevistas por competencias, comunicación ejecutiva.

EDUCACIÓN
Administración de Empresas – UCAB (2019)`,
			behavioral_ans_1:
				'Tuve un cliente que amenazó con cancelar el contrato por un problema de soporte. Lo llamé personalmente, escuché todas sus frustraciones sin interrumpir, identifiqué el problema raíz (tiempo de respuesta de soporte), escalé internamente y negocié un SLA mejorado. El cliente renovó el contrato.',
			behavioral_ans_2:
				'Prometí a un cliente una funcionalidad que no estaba en el roadmap. Cuando lo descubrí, fui honesta con el cliente de inmediato, ofrecí una alternativa dentro del producto actual y una compensación en el próximo ciclo. El cliente lo entendió y valoró la transparencia.',
		},
	];

	const createdCandidates: CandidateRecord[] = [];

	for (const c of candidateData) {
		const userId = await upsertUserWithAccount(prisma, c.email, `${c.name} ${c.lastname}`, 'candidate', DEFAULT_PASSWORD);

		const hardAttrIds = c.hardSkills.length > 0 ? attrs(attrMap, 'hard_skill', ...c.hardSkills) : [];
		const softAttrIds = c.softSkills.length > 0 ? attrs(attrMap, 'soft_skill', ...c.softSkills) : [];
		const valueAttrIds = c.values.length > 0 ? attrs(attrMap, 'value', ...c.values) : [];
		const allAttrIds = [...hardAttrIds, ...softAttrIds, ...valueAttrIds];

		const candidate = await prisma.candidates.upsert({
			where: { user_id: userId },
			update: {
				name: c.name,
				lastname: c.lastname,
				city: c.city,
				state: c.state,
				country: c.country,
				phone: c.phone,
				dress_code: c.dress_code,
				collaboration_style: c.collaboration_style,
				work_pace: c.work_pace,
				level_of_autonomy: c.level_of_autonomy,
				dealing_with_management: c.dealing_with_management,
				level_of_monitoring: c.level_of_monitoring,
				cv_text: c.cv_text,
				behavioral_ans_1: c.behavioral_ans_1,
				behavioral_ans_2: c.behavioral_ans_2,
			},
			create: {
				user_id: userId,
				name: c.name,
				lastname: c.lastname,
				city: c.city,
				state: c.state,
				country: c.country,
				phone: c.phone,
				dress_code: c.dress_code,
				collaboration_style: c.collaboration_style,
				work_pace: c.work_pace,
				level_of_autonomy: c.level_of_autonomy,
				dealing_with_management: c.dealing_with_management,
				level_of_monitoring: c.level_of_monitoring,
				cv_text: c.cv_text,
				behavioral_ans_1: c.behavioral_ans_1,
				behavioral_ans_2: c.behavioral_ans_2,
				candidate_attributes: {
					create: allAttrIds.map((attribute_id) => ({ attribute_id })),
				},
			},
			select: { id: true },
		});

		// Si ya existía, agregar atributos faltantes
		if (allAttrIds.length > 0) {
			await prisma.candidate_attributes.createMany({
				data: allAttrIds.map((attribute_id) => ({ candidate_id: candidate.id, attribute_id })),
				skipDuplicates: true,
			});
		}

		createdCandidates.push({ id: candidate.id, userId });
	}

	console.log(`  ✓ Candidatos: ${createdCandidates.length} creados`);
	return createdCandidates;
}

// ─── PASO 8: Postulaciones ────────────────────────────────────────────────────

async function seedApplications(
	prisma: PrismaClient,
	jobs: JobRecord[],
	candidates: CandidateRecord[],
): Promise<number[]> {
	// Índices: jobs[0]=Frontend Senior, [1]=Backend Node, [2]=Data Analyst,
	//          [3]=DevOps, [4]=UX/UI, [5]=Marketing, [6]=Data Scientist,
	//          [7]=Full Stack, [8]=RRHH, [9]=Finanzas,
	//          [10]=PM(closed), [11]=Backend Python(closed), [12]=Ops(closed)
	// Candidatos: [0]=Ana, [1]=Carlos, [2]=María, [3]=Luis, [4]=Valeria,
	//             [5]=Diego, [6]=Sofía, [7]=Andrés, [8]=Camila, [9]=Roberto,
	//             [10]=Isabella, [11]=Tomás, [12]=Gabriela, [13]=Sebastián, [14]=Laura

	const applicationMatrix: Array<{ jobIdx: number; candIdx: number }> = [
		// Job 0: Frontend Senior (Ana, María, Sebastián, Roberto)
		{ jobIdx: 0, candIdx: 0 }, { jobIdx: 0, candIdx: 2 },
		{ jobIdx: 0, candIdx: 13 }, { jobIdx: 0, candIdx: 9 },
		// Job 1: Backend Node.js (Luis, Roberto, Andrés)
		{ jobIdx: 1, candIdx: 3 }, { jobIdx: 1, candIdx: 9 }, { jobIdx: 1, candIdx: 7 },
		// Job 2: Data Analyst (Carlos, Isabella, Tomás)
		{ jobIdx: 2, candIdx: 1 }, { jobIdx: 2, candIdx: 10 }, { jobIdx: 2, candIdx: 11 },
		// Job 3: DevOps (Diego, Andrés)
		{ jobIdx: 3, candIdx: 5 }, { jobIdx: 3, candIdx: 7 },
		// Job 4: UX/UI (Valeria, Camila)
		{ jobIdx: 4, candIdx: 4 }, { jobIdx: 4, candIdx: 8 },
		// Job 5: Marketing (Camila, Gabriela, Laura)
		{ jobIdx: 5, candIdx: 8 }, { jobIdx: 5, candIdx: 12 }, { jobIdx: 5, candIdx: 14 },
		// Job 6: Data Scientist (Isabella, Carlos)
		{ jobIdx: 6, candIdx: 10 }, { jobIdx: 6, candIdx: 1 },
		// Job 7: Full Stack (María, Roberto, Ana)
		{ jobIdx: 7, candIdx: 2 }, { jobIdx: 7, candIdx: 9 }, { jobIdx: 7, candIdx: 0 },
		// Job 8: RRHH (Sofía, Laura, Gabriela)
		{ jobIdx: 8, candIdx: 6 }, { jobIdx: 8, candIdx: 14 }, { jobIdx: 8, candIdx: 12 },
		// Job 9: Finanzas (Tomás, Carlos)
		{ jobIdx: 9, candIdx: 11 }, { jobIdx: 9, candIdx: 1 },
		// Job 10: Product Manager - closed (Gabriela, Luis)
		{ jobIdx: 10, candIdx: 12 }, { jobIdx: 10, candIdx: 3 },
		// Job 11: Backend Python - closed (Andrés, Roberto)
		{ jobIdx: 11, candIdx: 7 }, { jobIdx: 11, candIdx: 9 },
		// Job 12: Ops Manager - closed (Luis, Tomás)
		{ jobIdx: 12, candIdx: 3 }, { jobIdx: 12, candIdx: 11 },
	];

	const applicationIds: number[] = [];

	for (const { jobIdx, candIdx } of applicationMatrix) {
		const job = jobs[jobIdx];
		const candidate = candidates[candIdx];
		if (!job || !candidate) continue;

		try {
			const application = await prisma.applications.create({
				data: {
					job_id: job.id,
					candidate_id: candidate.id,
					status: 'applied',
					evaluation_status: 'pending',
					applications_registers: {
						create: [{ status: 'applied' }],
					},
				},
				select: { id: true },
			});
			applicationIds.push(application.id);
		} catch {
			// Puede que ya exista (upsert no disponible con unique compuesto en createMany)
		}
	}

	console.log(`  ✓ Postulaciones: ${applicationIds.length} creadas`);
	return applicationIds;
}

// ─── PASO 9: Notas de reclutador ──────────────────────────────────────────────

async function seedNotes(
	prisma: PrismaClient,
	applicationIds: number[],
	recruiterAdminId: number,
) {
	if (applicationIds.length < 5) return;

	const notesData = [
		{ appIdx: 0, text: 'Candidata con portafolio sólido en React. Next.js es un plus. Llamar para entrevista técnica.' },
		{ appIdx: 1, text: 'Buen perfil técnico. Revisar experiencia con NestJS en la entrevista. Disponibilidad inmediata.' },
		{ appIdx: 2, text: 'Experiencia en Power BI destacada. Verificar nivel de Python en prueba técnica.' },
		{ appIdx: 3, text: 'Perfil DevOps muy completo. AWS certificado. Alta prioridad.' },
		{ appIdx: 4, text: 'Portfolio de UX interesante. Agendar sesión de diseño en vivo.' },
		{ appIdx: 7, text: 'Full Stack con experiencia real en producción. Encaja con el equipo.' },
		{ appIdx: 8, text: 'Excelente perfil de RRHH con experiencia en tech. Potencial para liderar selección técnica.' },
		{ appIdx: 10, text: 'Candidato con background fuerte en Node.js. Indagar sobre experiencia con microservicios.' },
	];

	for (const note of notesData) {
		const appId = applicationIds[note.appIdx];
		if (!appId) continue;
		await prisma.notes.create({
			data: {
				application_id: appId,
				recruiter_id: recruiterAdminId,
				text: note.text,
			},
		});
	}

	console.log(`  ✓ Notas: ${notesData.length} creadas`);
}

// ─── PASO 10: Notificaciones ──────────────────────────────────────────────────

async function seedNotifications(
	prisma: PrismaClient,
	companyId: number,
	adminUserId: string,
	candidateUserIds: string[],
	applicationIds: number[],
	jobs: JobRecord[],
) {
	const staleDate = new Date(Date.now() - SEED_STALE_DAYS * 24 * 60 * 60 * 1000);

	// Dos jobs stale para notificaciones (mantener IDs fijos para upsert)
	const staleJobSinPostulaciones = await prisma.jobs.upsert({
		where: { id: 900001 },
		update: { title: 'Administrador de Redes - Seed', status: 'published', company_id: companyId, created_at: staleDate },
		create: {
			id: 900001,
			title: 'Administrador de Redes - Seed',
			description: 'Oferta de prueba para testing de notificaciones.',
			status: 'published',
			company_id: companyId,
			created_at: staleDate,
			updated_at: staleDate,
		},
		select: { id: true, title: true },
	});

	// Notificación admin: job sin candidatos
	await prisma.notifications.createMany({
		data: [
			{
				user_id: adminUserId,
				type: 'stale_job_without_candidates',
				entity_type: 'job',
				entity_id: staleJobSinPostulaciones.id,
				title: 'Oferta publicada sin postulaciones',
				message: `La oferta "${staleJobSinPostulaciones.title}" lleva ${SEED_STALE_DAYS} días publicada sin postulaciones.`,
				metadata: { seed: true },
			},
		],
		skipDuplicates: true,
	});

	// Notificaciones para los primeros 3 candidatos: aplicacion en revisión
	const notifCount = Math.min(3, candidateUserIds.length, applicationIds.length);
	for (let i = 0; i < notifCount; i++) {
		const userId = candidateUserIds[i];
		const appId = applicationIds[i];
		const jobTitle = jobs[i]?.id ? `oferta #${jobs[i]?.id}` : 'una oferta';
		if (!userId || !appId) continue;

		await prisma.notifications.createMany({
			data: [
				{
					user_id: userId,
					type: 'application_status_update',
					entity_type: 'application',
					entity_id: appId,
					title: 'Tu postulación está en revisión',
					message: `Tu postulación a "${jobTitle}" ha sido revisada por el equipo de reclutamiento.`,
					metadata: { seed: true },
				},
			],
			skipDuplicates: true,
		});
	}

	console.log(`  ✓ Notificaciones seed creadas`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	const { prisma, pool } = await getPrismaClient();

	try {
		await prisma.$connect();
		console.log('\n🚀 Iniciando seed completo para demo de tesis...\n');

		// 1. Empresa
		console.log('📦 Paso 1/9: Empresa...');
		const company = await seedCompany(prisma);

		// 2. Reclutadores
		console.log('👥 Paso 2/9: Reclutadores...');
		const recruiters = await seedRecruiters(prisma, company.id);
		const headRecruiterAdminId = recruiters[0]!.id;
		const headRecruiterUserId = recruiters[0]!.userId;

		// 3. Categorías
		console.log('🏷️  Paso 3/9: Categorías...');
		const catMap = await seedCategories(prisma);

		// 4. Global Attributes
		console.log('🎯 Paso 4/9: Global Attributes...');
		const attrMap = await seedGlobalAttributes(prisma);

		// 5. Company Attributes
		console.log('🏢 Paso 5/9: Company Attributes...');
		await seedCompanyAttributes(prisma, company.id, attrMap);

		// 6. Jobs
		console.log('💼 Paso 6/9: Ofertas laborales...');
		const jobs = await seedJobs(prisma, company.id, catMap, attrMap);

		// 7. Candidatos
		console.log('🧑‍💼 Paso 7/9: Candidatos...');
		const candidates = await seedCandidates(prisma, attrMap);

		// 8. Postulaciones
		console.log('📝 Paso 8/9: Postulaciones...');
		const applicationIds = await seedApplications(prisma, jobs, candidates);

		// 9. Notas y Notificaciones
		console.log('💬 Paso 9/9: Notas y Notificaciones...');
		await seedNotes(prisma, applicationIds, headRecruiterAdminId);
		await seedNotifications(
			prisma,
			company.id,
			headRecruiterUserId,
			candidates.map((c) => c.userId),
			applicationIds,
			jobs,
		);

		console.log('\n✅ Seed completado exitosamente!\n');
		console.log('═══════════════════════════════════════════════════════');
		console.log('📊 RESUMEN:');
		console.log(`   Empresa:        InnovateTech C.A.`);
		console.log(`   Reclutadores:   ${recruiters.length} (ver emails abajo)`);
		console.log(`   Categorías:     8`);
		console.log(`   Attributes:     50 (sin embeddings aún)`);
		console.log(`   Jobs:           ${jobs.length}`);
		console.log(`   Candidatos:     ${candidates.length}`);
		console.log(`   Postulaciones:  ${applicationIds.length} (estado: pending)`);
		console.log('');
		console.log('🔑 CREDENCIALES DE ACCESO:');
		console.log(`   Admin (head):   ${RECRUITERS[0]!.email} / ${DEFAULT_PASSWORD}`);
		console.log(`   Admin (rec1):   ${RECRUITERS[1]!.email} / ${DEFAULT_PASSWORD}`);
		console.log(`   Candidato 1:    ana.garcia@email.com / ${DEFAULT_PASSWORD}`);
		console.log(`   Candidato 2:    carlos.perez@email.com / ${DEFAULT_PASSWORD}`);
		console.log(`   Candidato demo: sebastian.morales@email.com / ${DEFAULT_PASSWORD}`);
		console.log('');
		console.log('⚠️  PRÓXIMOS PASOS:');
		console.log('   1. cd apps/fastapi && python scripts/generate-seed-embeddings.py');
		console.log('   2. Iniciar workers FastAPI: uv run python -m fastapi_service.main');
		console.log('   3. cd apps/api && pnpm trigger:evaluations');
		console.log('   4. Esperar ~20-30 min para que completen las evaluaciones');
		console.log('═══════════════════════════════════════════════════════\n');
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

void main();
