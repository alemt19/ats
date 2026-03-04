-- Replace invalid btree indexes on vector columns with pgvector ivfflat indexes.
-- Btree indexes fail with large vector payloads (e.g., 1536 dimensions).

DROP INDEX IF EXISTS "idx_global_attributes";
DROP INDEX IF EXISTS "idx_candidates_summary_embedding";
DROP INDEX IF EXISTS "idx_jobs_summary_embedding";

CREATE INDEX "idx_global_attributes"
  ON "global_attributes"
  USING ivfflat (("embedding"::vector(1536)) vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX "idx_candidates_summary_embedding"
  ON "candidates"
  USING ivfflat (("summary_embedding"::vector(1536)) vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX "idx_jobs_summary_embedding"
  ON "jobs"
  USING ivfflat (("summary_embedding"::vector(1536)) vector_cosine_ops)
  WITH (lists = 100);
