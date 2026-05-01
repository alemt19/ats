CREATE TYPE "font_size_enum" AS ENUM ('small', 'medium', 'large');

ALTER TABLE "candidates"
ADD COLUMN "font_size" "font_size_enum" NOT NULL DEFAULT 'medium';

ALTER TABLE "user_admin"
ADD COLUMN "font_size" "font_size_enum" NOT NULL DEFAULT 'medium';
