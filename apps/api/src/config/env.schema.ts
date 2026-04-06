/** @format */

import { z } from 'zod';

export const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	SUPABASE_URL: z.url().optional(),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
	SUPABASE_STORAGE_BUCKET: z.string().min(1).optional(),
	REDIS_URL: z.string().min(1).optional(),
	AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).optional(),
	AUTH_LOGIN_ATTEMPT_WINDOW_SECONDS: z.coerce.number().int().min(1).optional(),
	AUTH_LOGIN_LOCK_SECONDS: z.coerce.number().int().min(1).optional(),
	PORT: z.coerce.number().int().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;
