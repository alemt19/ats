-- Add credential value to attribute_type_enum
ALTER TYPE "attribute_type_enum" ADD VALUE 'credential';

-- Add years_of_experience to candidates
ALTER TABLE "candidates"
ADD COLUMN "years_of_experience" INTEGER;

-- Add min_years_required to jobs
ALTER TABLE "jobs"
ADD COLUMN "min_years_required" INTEGER;

-- Add credential_match_score and meets_min_years_required to applications
ALTER TABLE "applications"
ADD COLUMN "credential_match_score" DOUBLE PRECISION,
ADD COLUMN "meets_min_years_required" BOOLEAN;
