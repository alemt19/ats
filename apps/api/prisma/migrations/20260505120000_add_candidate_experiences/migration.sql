-- Create candidate_experiences table
CREATE TABLE "candidate_experiences" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "position" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- Indexes for lookups and sorting
CREATE INDEX "idx_candidate_experiences_candidate_id" ON "candidate_experiences"("candidate_id");
CREATE INDEX "idx_candidate_experiences_candidate_id_end_date" ON "candidate_experiences"("candidate_id", "end_date");

-- Foreign key to candidates
ALTER TABLE "candidate_experiences"
ADD CONSTRAINT "candidate_experiences_candidate_id_fkey"
FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;