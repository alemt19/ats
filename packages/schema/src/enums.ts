import { z } from "zod";

export const AttributeTypeSchema = z.enum([
  "hard_skill",
  "soft_skill",
  "value",
]);

export const ColaborationStyleSchema = z.enum([
  "independent",
  "team_oriented",
  "flexible",
]);

export const DealingWithManagementSchema = z.enum([
  "structured",
  "flexible",
  "none",
]);

export const DressCodeSchema = z.enum([
  "formal",
  "business_casual",
  "casual",
  "none",
]);

export const EmploymentSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
]);

export const JobStatusSchema = z.enum([
  "draft",
  "published",
  "closed",
  "archived",
]);

export const LevelOfAutonomySchema = z.enum(["low", "medium", "high"]);

export const LevelOfMonitoringSchema = z.enum(["low", "medium", "high"]);

export const WorkPaceSchema = z.enum(["slow", "moderate", "fast"]);

export const WorkplaceSchema = z.enum(["remote", "onsite", "hybrid"]);
