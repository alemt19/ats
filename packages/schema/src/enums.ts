/** @format */

import { z } from 'zod';

export const AttributeTypeSchema = z.enum([
	'hard_skill',
	'soft_skill',
	'value',
]);

export const ColaborationStyleSchema = z.enum([
	'individual',
	'mixed',
	'highly_collaborative',
]);

export const DealingWithManagementSchema = z.enum([
	'strictly_professional',
	'friendly_and_approachable',
	'nearby',
]);

export const DressCodeSchema = z.enum([
	'formal',
	'semi_formal',
	'casual',
]);

export const EmploymentSchema = z.enum([
	'full_time',
	'part_time',
	'contract',
	'internship',
]);

export const JobStatusSchema = z.enum([
	'draft',
	'published',
	'closed',
	'archived',
]);

export const LevelOfAutonomySchema = z.enum(['high_control', 'balanced', 'total_freedom']);

export const LevelOfMonitoringSchema = z.enum([
	'daily_monitoring',
	'frequent_monitoring',
	'weekly_goals',
	'biweekly_goals',
	'total_trust',
]);

export const WorkPaceSchema = z.enum(['slow', 'moderate', 'accelerated']);

export const WorkplaceSchema = z.enum(['remote', 'onsite', 'hybrid']);

export type AttributeType = z.infer<typeof AttributeTypeSchema>;
export type ColaborationStyle = z.infer<typeof ColaborationStyleSchema>;
export type DealingWithManagement = z.infer<typeof DealingWithManagementSchema>;
export type DressCode = z.infer<typeof DressCodeSchema>;
export type EmploymentType = z.infer<typeof EmploymentSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type LevelOfAutonomy = z.infer<typeof LevelOfAutonomySchema>;
export type LevelOfMonitoring = z.infer<typeof LevelOfMonitoringSchema>;
export type WorkPace = z.infer<typeof WorkPaceSchema>;
export type WorkplaceType = z.infer<typeof WorkplaceSchema>;
