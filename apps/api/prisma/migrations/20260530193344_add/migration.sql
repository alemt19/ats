-- CreateTable
CREATE TABLE "generic_job_description" (
    "id" SERIAL NOT NULL,
    "position" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generic_job_description_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_generic_job_description_position" ON "generic_job_description"("position");

