-- Align cultural enum types in DB with current Prisma schema values.
-- This migration remaps existing values from old labels to new labels.

-- 1) colaboration_style_enum
CREATE TYPE "colaboration_style_enum_new" AS ENUM ('individual', 'mixed', 'highly_collaborative');

ALTER TABLE "companies"
  ALTER COLUMN "colaboration_style" TYPE "colaboration_style_enum_new"
  USING (
    CASE
      WHEN "colaboration_style"::text = 'independent' THEN 'individual'
      WHEN "colaboration_style"::text = 'team-oriented' THEN 'highly_collaborative'
      WHEN "colaboration_style"::text = 'flexible' THEN 'mixed'
      WHEN "colaboration_style" IS NULL THEN NULL
      ELSE NULL
    END
  )::"colaboration_style_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "collaboration_style" TYPE "colaboration_style_enum_new"
  USING (
    CASE
      WHEN "collaboration_style"::text = 'independent' THEN 'individual'
      WHEN "collaboration_style"::text = 'team-oriented' THEN 'highly_collaborative'
      WHEN "collaboration_style"::text = 'flexible' THEN 'mixed'
      WHEN "collaboration_style" IS NULL THEN NULL
      ELSE NULL
    END
  )::"colaboration_style_enum_new";

DROP TYPE "colaboration_style_enum";
ALTER TYPE "colaboration_style_enum_new" RENAME TO "colaboration_style_enum";

-- 2) dealing_with_management_enum
CREATE TYPE "dealing_with_management_enum_new" AS ENUM ('strictly_professional', 'friendly_and_approachable', 'nearby');

ALTER TABLE "companies"
  ALTER COLUMN "dealing_with_management" TYPE "dealing_with_management_enum_new"
  USING (
    CASE
      WHEN "dealing_with_management"::text = 'structured' THEN 'strictly_professional'
      WHEN "dealing_with_management"::text = 'flexible' THEN 'friendly_and_approachable'
      WHEN "dealing_with_management"::text = 'none' THEN 'nearby'
      WHEN "dealing_with_management" IS NULL THEN NULL
      ELSE NULL
    END
  )::"dealing_with_management_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "dealing_with_management" TYPE "dealing_with_management_enum_new"
  USING (
    CASE
      WHEN "dealing_with_management"::text = 'structured' THEN 'strictly_professional'
      WHEN "dealing_with_management"::text = 'flexible' THEN 'friendly_and_approachable'
      WHEN "dealing_with_management"::text = 'none' THEN 'nearby'
      WHEN "dealing_with_management" IS NULL THEN NULL
      ELSE NULL
    END
  )::"dealing_with_management_enum_new";

DROP TYPE "dealing_with_management_enum";
ALTER TYPE "dealing_with_management_enum_new" RENAME TO "dealing_with_management_enum";

-- 3) dress_code_enum
CREATE TYPE "dress_code_enum_new" AS ENUM ('formal', 'semi_formal', 'casual');

ALTER TABLE "companies"
  ALTER COLUMN "dress_code" TYPE "dress_code_enum_new"
  USING (
    CASE
      WHEN "dress_code"::text = 'formal' THEN 'formal'
      WHEN "dress_code"::text = 'business_casual' THEN 'semi_formal'
      WHEN "dress_code"::text = 'casual' THEN 'casual'
      WHEN "dress_code"::text = 'none' THEN 'casual'
      WHEN "dress_code" IS NULL THEN NULL
      ELSE NULL
    END
  )::"dress_code_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "dress_code" TYPE "dress_code_enum_new"
  USING (
    CASE
      WHEN "dress_code"::text = 'formal' THEN 'formal'
      WHEN "dress_code"::text = 'business_casual' THEN 'semi_formal'
      WHEN "dress_code"::text = 'casual' THEN 'casual'
      WHEN "dress_code"::text = 'none' THEN 'casual'
      WHEN "dress_code" IS NULL THEN NULL
      ELSE NULL
    END
  )::"dress_code_enum_new";

DROP TYPE "dress_code_enum";
ALTER TYPE "dress_code_enum_new" RENAME TO "dress_code_enum";

-- 4) level_of_autonomy_enum
CREATE TYPE "level_of_autonomy_enum_new" AS ENUM ('high_control', 'balanced', 'total_freedom');

ALTER TABLE "companies"
  ALTER COLUMN "level_of_autonomy" TYPE "level_of_autonomy_enum_new"
  USING (
    CASE
      WHEN "level_of_autonomy"::text = 'low' THEN 'high_control'
      WHEN "level_of_autonomy"::text = 'medium' THEN 'balanced'
      WHEN "level_of_autonomy"::text = 'high' THEN 'total_freedom'
      WHEN "level_of_autonomy" IS NULL THEN NULL
      ELSE NULL
    END
  )::"level_of_autonomy_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "level_of_autonomy" TYPE "level_of_autonomy_enum_new"
  USING (
    CASE
      WHEN "level_of_autonomy"::text = 'low' THEN 'high_control'
      WHEN "level_of_autonomy"::text = 'medium' THEN 'balanced'
      WHEN "level_of_autonomy"::text = 'high' THEN 'total_freedom'
      WHEN "level_of_autonomy" IS NULL THEN NULL
      ELSE NULL
    END
  )::"level_of_autonomy_enum_new";

DROP TYPE "level_of_autonomy_enum";
ALTER TYPE "level_of_autonomy_enum_new" RENAME TO "level_of_autonomy_enum";

-- 5) level_of_monitoring_enum
CREATE TYPE "level_of_monitoring_enum_new" AS ENUM ('daily_monitoring', 'frequent_monitoring', 'weekly_goals', 'biweekly_goals', 'total_trust');

ALTER TABLE "companies"
  ALTER COLUMN "level_of_monitoring" TYPE "level_of_monitoring_enum_new"
  USING (
    CASE
      WHEN "level_of_monitoring"::text = 'high' THEN 'daily_monitoring'
      WHEN "level_of_monitoring"::text = 'medium' THEN 'weekly_goals'
      WHEN "level_of_monitoring"::text = 'low' THEN 'total_trust'
      WHEN "level_of_monitoring" IS NULL THEN NULL
      ELSE NULL
    END
  )::"level_of_monitoring_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "level_of_monitoring" TYPE "level_of_monitoring_enum_new"
  USING (
    CASE
      WHEN "level_of_monitoring"::text = 'high' THEN 'daily_monitoring'
      WHEN "level_of_monitoring"::text = 'medium' THEN 'weekly_goals'
      WHEN "level_of_monitoring"::text = 'low' THEN 'total_trust'
      WHEN "level_of_monitoring" IS NULL THEN NULL
      ELSE NULL
    END
  )::"level_of_monitoring_enum_new";

DROP TYPE "level_of_monitoring_enum";
ALTER TYPE "level_of_monitoring_enum_new" RENAME TO "level_of_monitoring_enum";

-- 6) work_pace_enum
CREATE TYPE "work_pace_enum_new" AS ENUM ('slow', 'moderate', 'accelerated');

ALTER TABLE "companies"
  ALTER COLUMN "work_pace" TYPE "work_pace_enum_new"
  USING (
    CASE
      WHEN "work_pace"::text = 'slow' THEN 'slow'
      WHEN "work_pace"::text = 'moderate' THEN 'moderate'
      WHEN "work_pace"::text = 'fast' THEN 'accelerated'
      WHEN "work_pace" IS NULL THEN NULL
      ELSE NULL
    END
  )::"work_pace_enum_new";

ALTER TABLE "candidates"
  ALTER COLUMN "work_pace" TYPE "work_pace_enum_new"
  USING (
    CASE
      WHEN "work_pace"::text = 'slow' THEN 'slow'
      WHEN "work_pace"::text = 'moderate' THEN 'moderate'
      WHEN "work_pace"::text = 'fast' THEN 'accelerated'
      WHEN "work_pace" IS NULL THEN NULL
      ELSE NULL
    END
  )::"work_pace_enum_new";

DROP TYPE "work_pace_enum";
ALTER TYPE "work_pace_enum_new" RENAME TO "work_pace_enum";
