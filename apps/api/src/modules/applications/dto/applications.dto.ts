/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateApplicationSchema, UpdateApplicationSchema, ApplicationSchema, PaginationSchema } from '@repo/schema';

const ApplicationsQuerySchema = PaginationSchema.extend({
	job_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
	candidate_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
});

const CreateApplicationFeedbackSchema = z.object({
	overall_rating: z.number().int().min(1).max(5),
	process_rating: z.number().int().min(1).max(5).optional(),
	match_accuracy_rating: z.number().int().min(1).max(5).optional(),
	comments: z.string().max(1000).optional(),
});

export class CreateApplicationDto extends createZodDto(CreateApplicationSchema) {}
export class UpdateApplicationDto extends createZodDto(UpdateApplicationSchema) {}
export class ApplicationsQueryDto extends createZodDto(ApplicationsQuerySchema) {}
export class CreateApplicationFeedbackDto extends createZodDto(CreateApplicationFeedbackSchema) {}
