/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RecruitersQuerySchema = z.object({
	search: z.string().trim().optional(),
	page: z.coerce.number().int().positive().default(1).optional(),
	pageSize: z.coerce.number().int().positive().max(100).default(10).optional(),
});

const CreateRecruiterSchema = z.object({
	profile_picture: z.string().trim().optional(),
	name: z.string().trim().min(1).max(100),
	lastname: z.string().trim().min(1).max(100),
	email: z.string().trim().email(),
	password: z.string().min(8),
	dni: z.string().trim().max(50).optional().default(''),
	phone: z.string().trim().max(50).optional().default(''),
	phone_prefix: z.string().trim().max(20).optional().default(''),
	role: z.string().trim().min(1).max(50),
	country: z.string().trim().max(100).optional().default(''),
	state: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	address: z.string().trim().min(1),
});

const UpdateRecruiterSchema = z.object({
	profile_picture: z.string().trim().optional(),
	name: z.string().trim().min(1).max(100),
	lastname: z.string().trim().min(1).max(100),
	email: z.string().trim().email().optional(),
	password: z.string().min(8).optional(),
	dni: z.string().trim().max(50).optional().default(''),
	phone: z.string().trim().max(50).optional().default(''),
	phone_prefix: z.string().trim().max(20).optional().default(''),
	role: z.string().trim().min(1).max(50),
	country: z.string().trim().max(100).optional().default(''),
	state: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	address: z.string().trim().min(1),
});

export class RecruitersQueryDto extends createZodDto(RecruitersQuerySchema) {}
export class CreateRecruiterDto extends createZodDto(CreateRecruiterSchema) {}
export class UpdateRecruiterDto extends createZodDto(UpdateRecruiterSchema) {}
