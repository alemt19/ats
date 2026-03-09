-- CreateEnum
CREATE TYPE "evaluation_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "evaluation_status" "evaluation_status_enum" DEFAULT 'pending';

-- CreateTable
CREATE TABLE "application_similar_jobs" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "similar_job_id" INTEGER NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "match_technical_score" DOUBLE PRECISION,
    "match_soft_score" DOUBLE PRECISION,
    "match_culture_score" DOUBLE PRECISION,
    "overall_score" DOUBLE PRECISION,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_similar_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_similar_jobs_application_id" ON "application_similar_jobs"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_similar_jobs_application_id_similar_job_id_key" ON "application_similar_jobs"("application_id", "similar_job_id");

-- AddForeignKey
ALTER TABLE "application_similar_jobs" ADD CONSTRAINT "application_similar_jobs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_similar_jobs" ADD CONSTRAINT "application_similar_jobs_similar_job_id_fkey" FOREIGN KEY ("similar_job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
