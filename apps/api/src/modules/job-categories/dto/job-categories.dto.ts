/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const JobCategoriesQuerySchema = z.object({
	name: z.string().trim().optional(),
	page: z.coerce.number().int().positive().default(1).optional(),
	pageSize: z.coerce.number().int().positive().max(100).default(10).optional(),
});

const CreateJobCategorySchema = z.object({
	name: z.string().trim().min(1).max(255),
});

const UpdateJobCategorySchema = z.object({
	name: z.string().trim().min(1).max(255),
});

export class JobCategoriesQueryDto extends createZodDto(JobCategoriesQuerySchema) {}
export class CreateJobCategoryDto extends createZodDto(CreateJobCategorySchema) {}
export class UpdateJobCategoryDto extends createZodDto(UpdateJobCategorySchema) {}
