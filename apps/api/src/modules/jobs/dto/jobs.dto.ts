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

export class CreateJobDto extends createZodDto(CreateJobSchema) {}
export class CreateAdminOfferDto extends createZodDto(CreateAdminOfferSchema) {}
export class AdminOffersQueryDto extends createZodDto(AdminOffersQuerySchema) {}
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}
export class JobsQueryDto extends createZodDto(JobsQuerySchema) {}
