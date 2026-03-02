/** @format */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const envCandidates = [
	resolve(process.cwd(), '.env'),
	resolve(process.cwd(), 'apps/api/.env'),
];

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath });
		break;
	}
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'ts-node prisma/seed.ts',
	},
	datasource: {
		url: process.env['DIRECT_URL'],
	},
});
