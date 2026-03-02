/** @format */

import { createZodDto } from 'nestjs-zod';
import { CreateCandidateSchema, UpdateCandidateSchema, CandidateSchema, PaginationSchema } from '@repo/schema';
import { z } from 'zod';

export class CreateCandidateDto extends createZodDto(CreateCandidateSchema) {}
export class UpdateCandidateDto extends createZodDto(UpdateCandidateSchema) {}
export class CandidatesQueryDto extends createZodDto(PaginationSchema) {}

const UpdateMyCandidateSchema = z.object({
	profile_picture: z.string().nullable().optional(),
	name: z.string().max(100).nullable().optional(),
	lastname: z.string().max(100).nullable().optional(),
	dni: z.string().max(50).nullable().optional(),
	phone: z.string().max(50).nullable().optional(),
	country: z.string().max(100).nullable().optional(),
	state: z.string().max(100).nullable().optional(),
	city: z.string().max(100).nullable().optional(),
	address: z.string().nullable().optional(),
	contact_page: z.string().max(255).nullable().optional(),
});

export class UpdateMyCandidateDto extends createZodDto(UpdateMyCandidateSchema) {}
