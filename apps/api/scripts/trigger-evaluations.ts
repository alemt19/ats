/** @format */
/**
 * trigger-evaluations.ts
 *
 * Encola en BullMQ todas las applications con evaluation_status='pending'
 * para que los workers de FastAPI las procesen.
 *
 * Debe ejecutarse DESPUÉS de generate-seed-embeddings.py con los workers activos.
 *
 * Uso:
 *   cd apps/api && pnpm trigger:evaluations
 *
 * Requiere:
 *   - Redis corriendo (REDIS_URL en .env)
 *   - Workers FastAPI activos: uv run python -m fastapi_service.main
 *   - Embeddings generados en global_attributes y jobs
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Queue } from 'bullmq';
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

// ─── Configuración ────────────────────────────────────────────────────────────

function buildRedisConnection() {
	const redisUrl = process.env.REDIS_URL?.trim();
	if (!redisUrl) {
		console.log('  REDIS_URL no definida, usando localhost:6379');
		return { host: '127.0.0.1', port: 6379 };
	}
	const parsed = new URL(redisUrl);
	return {
		host: parsed.hostname,
		port: parsed.port ? Number(parsed.port) : 6379,
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		tls: parsed.protocol === 'rediss:' ? {} : undefined,
	};
}

async function getPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL no está definida');
	const pool = new Pool({ connectionString: databaseUrl });
	const adapter = new PrismaPg(pool);
	const prisma = new PrismaClient({ adapter });
	return { prisma, pool };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	const { prisma, pool } = await getPrismaClient();

	const queue = new Queue('evaluation', {
		connection: buildRedisConnection(),
	});

	try {
		await prisma.$connect();

		console.log('\n🚀 Trigger de evaluaciones para seed de demo\n');

		// Verificar que haya embeddings antes de encolar
		const attrsWithEmbedding = await prisma.$queryRaw<[{ count: bigint }]>`
			SELECT COUNT(*)::bigint as count FROM global_attributes WHERE embedding IS NOT NULL
		`;
		const totalAttrs = await prisma.global_attributes.count();
		const embeddedCount = Number(attrsWithEmbedding[0]?.count ?? 0);

		if (embeddedCount === 0) {
			console.error('❌ No hay atributos con embeddings.');
			console.error('   Primero ejecuta: python scripts/generate-seed-embeddings.py');
			process.exit(1);
		}

		if (embeddedCount < totalAttrs) {
			console.warn(
				`⚠️  Solo ${embeddedCount}/${totalAttrs} atributos tienen embeddings.`,
			);
			console.warn('   Los atributos sin embedding no serán considerados en el scoring.');
		} else {
			console.log(`  ✓ Atributos con embeddings: ${embeddedCount}/${totalAttrs}`);
		}

		// Buscar todas las aplicaciones pendientes
		const pendingApplications = await prisma.applications.findMany({
			where: { evaluation_status: 'pending' },
			select: {
				id: true,
				candidate_id: true,
				job_id: true,
				jobs: { select: { title: true } },
				candidates: { select: { name: true, lastname: true } },
			},
			orderBy: { id: 'asc' },
		});

		if (pendingApplications.length === 0) {
			console.log('ℹ️  No hay aplicaciones pendientes de evaluación.');
			console.log('   Ejecuta primero: pnpm prisma:seed');
			return;
		}

		console.log(`\n📋 Encolando ${pendingApplications.length} evaluaciones...\n`);

		let enqueued = 0;
		let errors = 0;

		for (const app of pendingApplications) {
			if (!app.candidate_id || !app.job_id) {
				console.warn(`  ⚠️  Aplicación ${app.id}: sin candidate_id o job_id, saltando.`);
				errors++;
				continue;
			}

			try {
				await queue.add(
					'evaluate',
					{
						applicationId: app.id,
						candidateId: app.candidate_id,
						jobId: app.job_id,
					},
					{
						attempts: Number.MAX_SAFE_INTEGER,
						backoff: { type: 'exponential', delay: 10_000 },
						removeOnComplete: true,
						removeOnFail: false,
					},
				);

				enqueued++;
				const candidateName = `${app.candidates?.name ?? ''} ${app.candidates?.lastname ?? ''}`.trim();
				const jobTitle = app.jobs?.title ?? `job #${app.job_id}`;
				console.log(
					`  ✓ [${enqueued}/${pendingApplications.length}] ${candidateName} → "${jobTitle}" (app #${app.id})`,
				);
			} catch (err) {
				console.error(`  ❌ Error encolando aplicación ${app.id}:`, err);
				errors++;
			}
		}

		console.log('\n' + '═'.repeat(60));
		console.log('RESUMEN:');
		console.log(`  ✅ Encoladas:  ${enqueued}`);
		if (errors > 0) console.log(`  ❌ Errores:    ${errors}`);
		console.log('');
		console.log('⏱️  Las evaluaciones se procesarán en los próximos 20-30 min.');
		console.log('   Monitorea el progreso en:');
		console.log('   • Logs del worker FastAPI');
		console.log('   • Admin dashboard: /admin/dashboard');
		console.log('   • O consulta directamente:');
		console.log("     SELECT evaluation_status, COUNT(*) FROM applications GROUP BY evaluation_status;");
		console.log('═'.repeat(60) + '\n');
	} finally {
		await prisma.$disconnect();
		await pool.end();
		await queue.close();
	}
}

void main();
