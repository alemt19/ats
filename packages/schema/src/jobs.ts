/** @format */

import { z } from 'zod';
import { EmploymentSchema, JobStatusSchema, WorkplaceSchema } from './enums';

export const JobSchema = z.object({
	id: z.number().int(),
	company_id: z.number().int().nullable(),
	category_id: z.number().int().nullable(),
	title: z.string().max(255),
	description: z.string(),
	summary: z.string().nullable(),
	// Note: summary_embedding Unsupported("vector") is generally handled server-side
	status: JobStatusSchema.nullable().default('draft'),
	address: z.string().max(255).nullable(),
	city: z.string().max(100).nullable(),
	state: z.string().max(100).nullable(),
	workplace_type: WorkplaceSchema.nullable(),
	employment_type: EmploymentSchema.nullable(),
	position: z.string().max(100).nullable(),
	salary: z.string().max(100).nullable(),
	weight_technical: z.number().nullable().default(0.4),
	weight_soft: z.number().nullable().default(0.3),
	weight_culture: z.number().nullable().default(0.3),
	created_at: z.string().pipe(z.coerce.date()).nullable(),
	updated_at: z.string().pipe(z.coerce.date()).nullable(),
});

export const CreateJobSchema = JobSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateJobSchema = CreateJobSchema.partial();
