-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_candidates_summary_embedding" ON "candidates"("summary_embedding");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_global_attributes" ON "global_attributes"("embedding");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_jobs_summary_embedding" ON "jobs"("summary_embedding");
