/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateJobSchema, UpdateJobSchema, JobSchema, PaginationSchema, JobStatusSchema } from '@repo/schema';

const JobsQuerySchema = PaginationSchema.extend({
	company_id: z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int()).optional(),
	status: JobStatusSchema.optional(),
});

export class CreateJobDto extends createZodDto(CreateJobSchema) {}
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}
export class JobsQueryDto extends createZodDto(JobsQuerySchema) {}
