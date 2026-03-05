/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateAdminProfileSchema = z.object({
	profile_picture: z.string().trim().optional(),
	name: z.string().trim().min(1).max(100),
	lastname: z.string().trim().min(1).max(100),
	dni: z.string().trim().max(50).optional().default(''),
	phone: z.string().trim().max(50).optional().default(''),
	phone_prefix: z.string().trim().max(20).optional().default(''),
	state: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	address: z.string().trim().min(1),
	birth_date: z.string().trim().optional().default(''),
});

export class UpdateAdminProfileDto extends createZodDto(UpdateAdminProfileSchema) {}
