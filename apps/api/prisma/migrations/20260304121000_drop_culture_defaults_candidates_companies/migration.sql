-- Remove DB-level defaults so these nullable fields initialize as NULL when omitted.

ALTER TABLE "candidates"
  ALTER COLUMN "dress_code" DROP DEFAULT,
  ALTER COLUMN "collaboration_style" DROP DEFAULT,
  ALTER COLUMN "work_pace" DROP DEFAULT,
  ALTER COLUMN "level_of_autonomy" DROP DEFAULT,
  ALTER COLUMN "dealing_with_management" DROP DEFAULT,
  ALTER COLUMN "level_of_monitoring" DROP DEFAULT;

ALTER TABLE "companies"
  ALTER COLUMN "dress_code" DROP DEFAULT,
  ALTER COLUMN "colaboration_style" DROP DEFAULT,
  ALTER COLUMN "work_pace" DROP DEFAULT,
  ALTER COLUMN "level_of_autonomy" DROP DEFAULT,
  ALTER COLUMN "dealing_with_management" DROP DEFAULT,
  ALTER COLUMN "level_of_monitoring" DROP DEFAULT;
