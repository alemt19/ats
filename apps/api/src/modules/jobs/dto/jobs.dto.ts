/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateJobSchema, UpdateJobSchema, JobSchema, PaginationSchema, JobStatusSchema } from '@repo/schema';

const JobsQuerySchema = PaginationSchema.extend({
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

export class CreateJobDto extends createZodDto(CreateJobSchema) {}
export class CreateAdminOfferDto extends createZodDto(CreateAdminOfferSchema) {}
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}
export class JobsQueryDto extends createZodDto(JobsQuerySchema) {}
