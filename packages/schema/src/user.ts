/** @format */

import { z } from 'zod';

export const userProfileSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	displayName: z.string().min(2).max(60),
	avatarUrl: z.string().url().nullable().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
