import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const dressCodeSchema = z.union([z.enum(['formal', 'semi_formal', 'casual']), z.literal('')]);
const colaborationStyleSchema = z.union([
	z.enum(['individual', 'mixed', 'highly_collaborative']),
	z.literal(''),
]);
const workPaceSchema = z.union([z.enum(['slow', 'moderate', 'accelerated']), z.literal('')]);
const levelOfAutonomySchema = z.union([
	z.enum(['high_control', 'balanced', 'total_freedom']),
	z.literal(''),
]);
const dealingWithManagementSchema = z.union([
	z.enum(['strictly_professional', 'friendly_and_approachable', 'nearby']),
	z.literal(''),
]);
const levelOfMonitoringSchema = z.union([
	z.enum(['daily_monitoring', 'frequent_monitoring', 'weekly_goals', 'biweekly_goals', 'total_trust']),
	z.literal(''),
]);

const CompanyConfigBootstrapSchema = z.object({
	initialData: z.object({
		name: z.string(),
		logo: z.string(),
		contact_email: z.string(),
		country: z.string(),
		state: z.string(),
		city: z.string(),
		address: z.string(),
		description: z.string(),
		mision: z.string(),
		values: z.array(z.string()),
		preferences: z.object({
			dress_code: z.string().optional(),
			colaboration_style: z.string().optional(),
			work_pace: z.string().optional(),
			level_of_autonomy: z.string().optional(),
			dealing_with_management: z.string().optional(),
			level_of_monitoring: z.string().optional(),
		}),
	}),
	companyValueOptions: z.array(z.string()),
});

const UpdateCompanyConfigSchema = z.object({
	name: z.string().trim().min(1).max(255),
	logo: z.string().optional(),
	contact_email: z.email().max(255).optional().or(z.literal('')),
	country: z.string().max(100).optional(),
	state: z.string().max(100).optional(),
	city: z.string().max(100).optional(),
	address: z.string().max(255).optional(),
	description: z.string().optional(),
	mision: z.string().optional(),
	dress_code: dressCodeSchema.optional(),
	colaboration_style: colaborationStyleSchema.optional(),
	work_pace: workPaceSchema.optional(),
	level_of_autonomy: levelOfAutonomySchema.optional(),
	dealing_with_management: dealingWithManagementSchema.optional(),
	level_of_monitoring: levelOfMonitoringSchema.optional(),
	values: z.union([z.array(z.string()), z.string()]).optional(),
	values_json: z.string().optional(),
});

export class CompanyConfigBootstrapDto extends createZodDto(CompanyConfigBootstrapSchema) {}
export class UpdateCompanyConfigDto extends createZodDto(UpdateCompanyConfigSchema) {}
