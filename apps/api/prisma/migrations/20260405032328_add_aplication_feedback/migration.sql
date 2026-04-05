-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "feedback_author_enum" AS ENUM ('employer', 'candidate');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "application_feedback" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "author_type" "feedback_author_enum" NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "process_rating" INTEGER,
    "match_accuracy_rating" INTEGER,
    "comments" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_application_feedback_application_id" ON "application_feedback"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_feedback_application_id_author_type_idx" ON "application_feedback"("application_id", "author_type");

-- CreateIndex (safe - skip if already exists)
CREATE INDEX IF NOT EXISTS "idx_candidates_summary_embedding" ON "candidates"("summary_embedding");

-- CreateIndex (safe - skip if already exists)
CREATE INDEX IF NOT EXISTS "idx_global_attributes" ON "global_attributes"("embedding");

-- CreateIndex (safe - skip if already exists)
CREATE INDEX IF NOT EXISTS "idx_jobs_summary_embedding" ON "jobs"("summary_embedding");

-- AddForeignKey
ALTER TABLE "application_feedback" ADD CONSTRAINT "application_feedback_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
