CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "user_role_enum" AS ENUM ('candidate', 'admin');

-- CreateEnum
CREATE TYPE "attribute_type_enum" AS ENUM ('hard_skill', 'soft_skill', 'value');

-- CreateEnum
CREATE TYPE "colaboration_style_enum" AS ENUM ('independent', 'team-oriented', 'flexible');

-- CreateEnum
CREATE TYPE "dealing_with_management_enum" AS ENUM ('structured', 'flexible', 'none');

-- CreateEnum
CREATE TYPE "dress_code_enum" AS ENUM ('formal', 'business_casual', 'casual', 'none');

-- CreateEnum
CREATE TYPE "employment_enum" AS ENUM ('full_time', 'part_time', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "job_status_enum" AS ENUM ('draft', 'published', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "level_of_autonomy_enum" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "level_of_monitoring_enum" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "work_pace_enum" AS ENUM ('slow', 'moderate', 'fast');

-- CreateEnum
CREATE TYPE "workplace_enum" AS ENUM ('remote', 'onsite', 'hybrid');

-- CreateTable
CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER,
    "candidate_id" INTEGER,
    "match_technical_score" DOUBLE PRECISION,
    "match_soft_score" DOUBLE PRECISION,
    "match_culture_score" DOUBLE PRECISION,
    "overall_score" DOUBLE PRECISION,
    "ai_feedback" JSONB,
    "status" VARCHAR(50) DEFAULT 'applied',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_attributes" (
    "candidate_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,

    CONSTRAINT "candidate_attributes_pkey" PRIMARY KEY ("candidate_id","attribute_id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "profile_picture" TEXT,
    "name" VARCHAR(100),
    "lastname" VARCHAR(100),
    "user_id" TEXT,
    "dni" VARCHAR(50),
    "phone" VARCHAR(50),
    "country" VARCHAR(100),
    "state" VARCHAR(100),
    "city" VARCHAR(100),
    "address" TEXT,
    "cv_file_url" TEXT,
    "summary" TEXT,
    "summary_embedding" vector,
    "dress_code" "dress_code_enum" DEFAULT 'none',
    "collaboration_style" "colaboration_style_enum" DEFAULT 'flexible',
    "work_pace" "work_pace_enum" DEFAULT 'moderate',
    "level_of_autonomy" "level_of_autonomy_enum" DEFAULT 'medium',
    "dealing_with_management" "dealing_with_management_enum" DEFAULT 'none',
    "level_of_monitoring" "level_of_monitoring_enum" DEFAULT 'medium',
    "behavioral_ans_1" TEXT,
    "behavioral_ans_2" TEXT,
    "contact_page" VARCHAR(255),
    "birth_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "mision" TEXT,
    "dress_code" "dress_code_enum" DEFAULT 'none',
    "colaboration_style" "colaboration_style_enum" DEFAULT 'flexible',
    "work_pace" "work_pace_enum" DEFAULT 'moderate',
    "level_of_autonomy" "level_of_autonomy_enum" DEFAULT 'medium',
    "dealing_with_management" "dealing_with_management_enum" DEFAULT 'none',
    "level_of_monitoring" "level_of_monitoring_enum" DEFAULT 'medium',
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "contact_email" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_attributes" (
    "id" SERIAL NOT NULL,
    "attribute_id" INTEGER,
    "company_id" INTEGER,

    CONSTRAINT "company_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_attributes" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "attribute_type_enum" DEFAULT 'hard_skill',
    "embedding" vector,

    CONSTRAINT "global_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_attributes" (
    "job_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN DEFAULT false,

    CONSTRAINT "job_attributes_pkey" PRIMARY KEY ("job_id","attribute_id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "category_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "summary" TEXT,
    "summary_embedding" vector,
    "status" "job_status_enum" DEFAULT 'draft',
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "workplace_type" "workplace_enum",
    "employment_type" "employment_enum",
    "position" VARCHAR(100),
    "salary" VARCHAR(100),
    "weight_technical" DOUBLE PRECISION DEFAULT 0.4,
    "weight_soft" DOUBLE PRECISION DEFAULT 0.3,
    "weight_culture" DOUBLE PRECISION DEFAULT 0.3,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER,
    "recruiter_id" INTEGER,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_admin" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "profile_picture" TEXT,
    "name" VARCHAR(100),
    "lastname" VARCHAR(100),
    "user_id" TEXT,
    "dni" VARCHAR(50),
    "phone" VARCHAR(50),
    "role" VARCHAR(50),
    "country" VARCHAR(100),
    "state" VARCHAR(100),
    "city" VARCHAR(100),
    "address" TEXT,
    "birth_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "user_role_enum" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT,
    "provider" TEXT,
    "providerAccountId" TEXT,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accessToken" TEXT,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_applications_ai_feedback" ON "applications" USING GIN ("ai_feedback");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_idx" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_attributes_candidate_id" ON "candidate_attributes"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_user_id_key" ON "candidates"("user_id");

-- CreateIndex
CREATE INDEX "idx_candidates_user_id" ON "candidates"("user_id");

-- CreateIndex
CREATE INDEX "idx_candidates_summary_embedding" ON "candidates"("summary_embedding");

-- CreateIndex
CREATE UNIQUE INDEX "global_attributes_name_key" ON "global_attributes"("name");

-- CreateIndex
CREATE INDEX "idx_global_attributes" ON "global_attributes"("embedding");

-- CreateIndex
CREATE INDEX "idx_job_attributes_job_id" ON "job_attributes"("job_id");

-- CreateIndex
CREATE INDEX "idx_jobs_summary_embedding" ON "jobs"("summary_embedding");

-- CreateIndex
CREATE UNIQUE INDEX "user_admin_user_id_key" ON "user_admin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_sessionToken_key" ON "session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "session_accessToken_key" ON "session"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_value_key" ON "verification_token"("value");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_attributes" ADD CONSTRAINT "candidate_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "global_attributes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_attributes" ADD CONSTRAINT "candidate_attributes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_attributes" ADD CONSTRAINT "company_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "global_attributes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_attributes" ADD CONSTRAINT "company_attributes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_attributes" ADD CONSTRAINT "job_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "global_attributes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_attributes" ADD CONSTRAINT "job_attributes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "user_admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_admin" ADD CONSTRAINT "user_admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_admin" ADD CONSTRAINT "user_admin_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
