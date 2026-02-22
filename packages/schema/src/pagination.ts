/** @format */

import { z } from 'zod';

export const PaginationSchema = z.object({
	skip: z.preprocess(
		(val) => Number(val),
		z.number().int().min(0).default(0),
	),
	take: z.preprocess(
		(val) => Number(val),
		z.number().int().min(1).max(100).default(10),
	),
	search: z.string().optional(),
});

export type PaginationData = z.infer<typeof PaginationSchema>;
