-- Drop old unique constraint on name only
ALTER TABLE "global_attributes"
  DROP CONSTRAINT IF EXISTS "global_attributes_name_key";

-- Add composite unique constraint on (name, type)
ALTER TABLE "global_attributes"
  ADD CONSTRAINT "global_attributes_name_type_key" UNIQUE ("name", "type");
