/** @format */

import { z } from 'zod';
import {
	ColaborationStyleSchema,
	DealingWithManagementSchema,
	DressCodeSchema,
	LevelOfAutonomySchema,
	LevelOfMonitoringSchema,
	WorkPaceSchema,
} from './enums';

export const CompanySchema = z.object({
	id: z.number().int(),
	name: z.string().max(255),
	logo_url: z.string().nullable(),
	description: z.string().nullable(),
	mision: z.string().nullable(),
	dress_code: DressCodeSchema.nullable().default('none'),
	colaboration_style: ColaborationStyleSchema.nullable().default('flexible'),
	work_pace: WorkPaceSchema.nullable().default('moderate'),
	level_of_autonomy: LevelOfAutonomySchema.nullable().default('medium'),
	dealing_with_management:
		DealingWithManagementSchema.nullable().default('none'),
	level_of_monitoring: LevelOfMonitoringSchema.nullable().default('medium'),
	address: z.string().max(255).nullable(),
	city: z.string().max(100).nullable(),
	state: z.string().max(100).nullable(),
	country: z.string().max(100).nullable(),
	contact_email: z.string().email().max(255).nullable(), // Made email validation strict, or leave as string if it's not strictly an email
	created_at: z.string().pipe(z.coerce.date()).nullable(),
	updated_at: z.string().pipe(z.coerce.date()).nullable(),
});

export const CreateCompanySchema = CompanySchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type Company = z.infer<typeof CompanySchema>;
export type CreateCompanyData = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyData = z.infer<typeof UpdateCompanySchema>;
