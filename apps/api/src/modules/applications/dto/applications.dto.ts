/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateApplicationSchema, UpdateApplicationSchema, ApplicationSchema, PaginationSchema } from '@repo/schema';

const ApplicationsQuerySchema = PaginationSchema.extend({
	job_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
	candidate_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
});

export class CreateApplicationDto extends createZodDto(CreateApplicationSchema) {}
export class UpdateApplicationDto extends createZodDto(UpdateApplicationSchema) {}
export class ApplicationsQueryDto extends createZodDto(ApplicationsQuerySchema) {}
