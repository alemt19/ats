/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/;
const TODAY_DATE = new Date().toISOString().slice(0, 10);

const BirthDateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de nacimiento es obligatoria')
	.refine((value) => value <= TODAY_DATE, {
		message: 'La fecha de nacimiento no puede ser futura',
	});

const DniSchema = z
	.string()
	.trim()
	.regex(/^[VE]\d+$/, 'La cédula debe iniciar con V o E y contener solo números')
	.refine((value) => {
		const prefix = value[0];
		const numericValue = Number.parseInt(value.slice(1), 10);

		if (!Number.isFinite(numericValue)) {
			return false;
		}

		if (prefix === 'V') {
			return numericValue >= 100_000 && numericValue <= 99_999_999;
		}

		if (prefix === 'E') {
			return numericValue >= 80_000_000;
		}

		return false;
	}, {
		message: 'La cédula no cumple con el rango permitido para su prefijo',
	});

const PhoneSchema = z
	.string()
	.trim()
	.regex(/^\d{11}$/, 'El teléfono debe tener exactamente 11 dígitos');

const RecruitersQuerySchema = z.object({
	search: z.string().trim().optional(),
	page: z.coerce.number().int().positive().default(1).optional(),
	pageSize: z.coerce.number().int().positive().max(100).default(10).optional(),
});

const CreateRecruiterSchema = z.object({
	profile_picture: z.string().trim().optional(),
	name: z.string().trim().min(1).max(100).regex(NAME_REGEX, 'El nombre solo puede contener letras'),
	lastname: z.string().trim().min(1).max(100).regex(NAME_REGEX, 'El apellido solo puede contener letras'),
	email: z.string().trim().email(),
	password: z.string().min(8),
	birth_date: BirthDateSchema,
	dni: DniSchema,
	phone: PhoneSchema,
	phone_prefix: z.string().trim().max(20).optional().default(''),
	role: z.string().trim().min(1).max(50),
	country: z.string().trim().min(1).max(100),
	state: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	address: z.string().trim().min(1),
});

const UpdateRecruiterSchema = z.object({
	profile_picture: z.string().trim().optional(),
	name: z.string().trim().min(1).max(100).regex(NAME_REGEX, 'El nombre solo puede contener letras'),
	lastname: z.string().trim().min(1).max(100).regex(NAME_REGEX, 'El apellido solo puede contener letras'),
	email: z.string().trim().email().optional(),
	password: z.string().min(8).optional(),
	birth_date: BirthDateSchema,
	dni: DniSchema,
	phone: PhoneSchema,
	phone_prefix: z.string().trim().max(20).optional().default(''),
	role: z.string().trim().min(1).max(50),
	country: z.string().trim().min(1).max(100),
	state: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	address: z.string().trim().min(1),
});

export class RecruitersQueryDto extends createZodDto(RecruitersQuerySchema) {}
export class CreateRecruiterDto extends createZodDto(CreateRecruiterSchema) {}
export class UpdateRecruiterDto extends createZodDto(UpdateRecruiterSchema) {}
