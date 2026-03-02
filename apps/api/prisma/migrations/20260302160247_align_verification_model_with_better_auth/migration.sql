/*
  Warnings:

  - You are about to drop the column `expires` on the `verification_token` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `verification_token` table. All the data in the column will be lost.
  - The required column `id` was added to the `verification_token` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "verification_token_identifier_token_key";

-- DropIndex
DROP INDEX "verification_token_token_key";

-- DropIndex
DROP INDEX "verification_token_value_key";

-- AlterTable
ALTER TABLE "verification_token" DROP COLUMN "expires",
DROP COLUMN "token",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "verification_token_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "verification_token_identifier_idx" ON "verification_token"("identifier");
