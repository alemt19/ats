/** @format */

import { z } from 'zod';

export const EvaluationStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);

export const ApplicationSchema = z.object({
	id: z.number().int(),
	job_id: z.number().int().nullable(),
	candidate_id: z.number().int().nullable(),
	match_technical_score: z.number().nullable(),
	match_soft_score: z.number().nullable(),
	match_culture_score: z.number().nullable(),
	overall_score: z.number().nullable(),
	// ai_feedback is Json in Prisma. Using any or unknown, often custom Json schema
	ai_feedback: z.any().nullable(),
	status: z.string().max(50).nullable().default('applied'),
	evaluation_status: EvaluationStatusEnum.nullable().default('pending'),
	created_at: z.string().pipe(z.coerce.date()).nullable(),
	updated_at: z.string().pipe(z.coerce.date()).nullable(),
});

export const CreateApplicationSchema = ApplicationSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
	evaluation_status: true,
	match_technical_score: true,
	match_soft_score: true,
	match_culture_score: true,
	overall_score: true,
	ai_feedback: true,
});

export const UpdateApplicationSchema = CreateApplicationSchema.partial();

export const ApplyApplicationResultSchema = z.object({
	applicationId: z.number().int(),
	evaluationStatus: EvaluationStatusEnum.nullable().default('pending'),
});

export const SimilarApplicationJobSchema = z.object({
	id: z.number().int(),
	application_id: z.number().int(),
	similar_job_id: z.number().int(),
	similarity_score: z.number(),
	match_technical_score: z.number().nullable(),
	match_soft_score: z.number().nullable(),
	match_culture_score: z.number().nullable(),
	overall_score: z.number().nullable(),
	rank: z.number().int(),
	jobs: z
		.object({
			id: z.number().int(),
			title: z.string(),
			description: z.string().nullable().optional(),
			status: z.string().nullable().optional(),
			company_id: z.number().int().nullable().optional(),
			city: z.string().nullable().optional(),
			state: z.string().nullable().optional(),
			position: z.string().nullable().optional(),
			salary: z.string().nullable().optional(),
		})
		.nullable(),
});

export type Application = z.infer<typeof ApplicationSchema>;
export type CreateApplicationData = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationData = z.infer<typeof UpdateApplicationSchema>;
export type ApplyApplicationResult = z.infer<typeof ApplyApplicationResultSchema>;
export type SimilarApplicationJob = z.infer<typeof SimilarApplicationJobSchema>;
