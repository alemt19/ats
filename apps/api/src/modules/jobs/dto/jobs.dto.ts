/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateJobSchema, UpdateJobSchema, JobSchema, JobStatusSchema } from '@repo/schema';

const JobsQuerySchema = z.object({
	title: z.string().trim().optional(),
	category: z.string().trim().optional(),
	workplace_type: z.string().trim().optional(),
	employment_type: z.string().trim().optional(),
	city: z.string().trim().optional(),
	page: z.preprocess((val) => (val === undefined ? 1 : Number(val)), z.number().int().min(1)).optional(),
	pageSize: z.preprocess((val) => (val === undefined ? 10 : Number(val)), z.number().int().min(1).max(100)).optional(),
	company_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
	status: JobStatusSchema.optional(),
});

const CreateAdminOfferSchema = CreateJobSchema.omit({
	company_id: true,
	state: true,
	summary: true,
}).extend({
	technical_skill_items: z
		.array(
			z.object({
				name: z.string().trim().min(1),
				is_mandatory: z.boolean().optional().default(false),
			})
		)
		.optional()
		.default([]),
	soft_skill_items: z
		.array(
			z.object({
				name: z.string().trim().min(1),
				is_mandatory: z.boolean().optional().default(false),
			})
		)
		.optional()
		.default([]),
	status: JobStatusSchema.optional(),
	state: z.string().trim().optional(),
	summary: z.string().trim().optional(),
	technical_skills: z.array(z.string().trim()).optional().default([]),
	soft_skills: z.array(z.string().trim()).optional().default([]),
});

const AdminOffersQuerySchema = z.object({
	title: z.string().trim().optional(),
	category: z.string().trim().optional(),
	workplace_type: z.string().trim().optional(),
	employment_type: z.string().trim().optional(),
	city: z.string().trim().optional(),
	state: z.string().trim().optional(),
	status: z.string().trim().optional(),
	page: z.preprocess((val) => (val === undefined ? 1 : Number(val)), z.number().int().min(1)).optional(),
	pageSize: z.preprocess((val) => (val === undefined ? 10 : Number(val)), z.number().int().min(1).max(100)).optional(),
});

const scorePreprocess = (defaultVal: number) =>
	z.preprocess((val) => (val === undefined ? defaultVal : Number(val)), z.number().min(0).max(100)).optional();

const AdminOfferCandidatesQuerySchema = z.object({
	search: z.string().trim().optional().default(''),
	technical_min: scorePreprocess(0).default(0),
	technical_max: scorePreprocess(100).default(100),
	soft_min: scorePreprocess(0).default(0),
	soft_max: scorePreprocess(100).default(100),
	culture_min: scorePreprocess(0).default(0),
	culture_max: scorePreprocess(100).default(100),
	final_min: scorePreprocess(0).default(0),
	final_max: scorePreprocess(100).default(100),
	status: z.string().trim().optional().default('all'),
	page: z.preprocess((val) => (val === undefined ? 1 : Number(val)), z.number().int().min(1)).optional().default(1),
	pageSize: z.preprocess((val) => (val === undefined ? 8 : Number(val)), z.number().int().min(1).max(100)).optional().default(8),
});

export class CreateJobDto extends createZodDto(CreateJobSchema) {}
export class CreateAdminOfferDto extends createZodDto(CreateAdminOfferSchema) {}
export class AdminOffersQueryDto extends createZodDto(AdminOffersQuerySchema) {}
export class AdminOfferCandidatesQueryDto extends createZodDto(AdminOfferCandidatesQuerySchema) {}
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}
export class JobsQueryDto extends createZodDto(JobsQuerySchema) {}
