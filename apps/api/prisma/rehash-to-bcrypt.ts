/** @format */
// One-off script: migrates all credential account passwords from scrypt to bcrypt.
// Run once after switching Better Auth's password hasher to bcrypt.
// Usage: npx ts-node -P apps/api/tsconfig.json apps/api/prisma/rehash-to-bcrypt.ts

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { hash as bcryptHash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DEFAULT_PASSWORD = 'demo1234#';

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')];
for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL no está definida');

	const pool = new Pool({ connectionString: databaseUrl });
	const adapter = new PrismaPg(pool);
	const prisma = new PrismaClient({ adapter });

	try {
		await prisma.$connect();

		const accounts = await prisma.account.findMany({
			where: { providerId: 'credential', password: { not: null } },
			select: { id: true, password: true },
		});

		console.log(`\nEncontradas ${accounts.length} cuentas con contraseña.\n`);

		const newHash = await bcryptHash(DEFAULT_PASSWORD, 10);
		let migrated = 0;
		let skipped = 0;

		for (const account of accounts) {
			if (account.password?.startsWith('$2')) {
				// Already bcrypt
				skipped++;
				continue;
			}

			await prisma.account.update({
				where: { id: account.id },
				data: { password: newHash },
			});
			migrated++;
		}

		console.log(`✅ Migradas: ${migrated}`);
		console.log(`⏭  Ya eran bcrypt: ${skipped}`);
		console.log(`\nTodas las contraseñas migradas usan: "${DEFAULT_PASSWORD}"\n`);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

main().catch((err) => {
	console.error('ERROR:', err);
	process.exit(1);
});
