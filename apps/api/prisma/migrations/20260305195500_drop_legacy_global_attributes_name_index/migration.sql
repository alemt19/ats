-- Drop legacy unique index on name-only to allow uniqueness by (name, type)
DROP INDEX IF EXISTS "global_attributes_name_key";
