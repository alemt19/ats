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

export const CandidateSchema = z.object({
	id: z.number().int(),
	profile_picture: z.string().nullable(),
	name: z.string().max(100).nullable(),
	lastname: z.string().max(100).nullable(),
	email: z.string().email().max(255),
	password: z.string().max(255).nullable(),
	dni: z.string().max(50).nullable(),
	phone: z.string().max(50).nullable(),
	country: z.string().max(100).nullable(),
	state: z.string().max(100).nullable(),
	city: z.string().max(100).nullable(),
	address: z.string().nullable(),
	cv_file_url: z.string().nullable(),
	summary: z.string().nullable(),
	dress_code: DressCodeSchema.nullable().default('none'),
	collaboration_style: ColaborationStyleSchema.nullable().default('flexible'),
	work_pace: WorkPaceSchema.nullable().default('moderate'),
	level_of_autonomy: LevelOfAutonomySchema.nullable().default('medium'),
	dealing_with_management:
		DealingWithManagementSchema.nullable().default('none'),
	level_of_monitoring: LevelOfMonitoringSchema.nullable().default('medium'),
	behavioral_ans_1: z.string().nullable(),
	behavioral_ans_2: z.string().nullable(),
	contact_page: z.string().max(255).nullable(),
	birth_date: z.string().pipe(z.coerce.date()).nullable(),
	created_at: z.string().pipe(z.coerce.date()).nullable(),
	updated_at: z.string().pipe(z.coerce.date()).nullable(),
});

export const CreateCandidateSchema = CandidateSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateCandidateSchema = CreateCandidateSchema.partial();
