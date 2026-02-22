/** @format */

import { z } from 'zod';

export const AttributeTypeSchema = z.enum([
	'hard_skill',
	'soft_skill',
	'value',
]);

export const ColaborationStyleSchema = z.enum([
	'independent',
	'team_oriented',
	'flexible',
]);

export const DealingWithManagementSchema = z.enum([
	'structured',
	'flexible',
	'none',
]);

export const DressCodeSchema = z.enum([
	'formal',
	'business_casual',
	'casual',
	'none',
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

export const LevelOfAutonomySchema = z.enum(['low', 'medium', 'high']);

export const LevelOfMonitoringSchema = z.enum(['low', 'medium', 'high']);

export const WorkPaceSchema = z.enum(['slow', 'moderate', 'fast']);

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
