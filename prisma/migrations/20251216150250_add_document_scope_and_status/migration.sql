/*
  Warnings:

  - The `status` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('GLOBAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "error" TEXT,
ADD COLUMN     "scope" "DocumentScope" NOT NULL DEFAULT 'PROJECT',
DROP COLUMN "status",
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'uploaded';

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "scope" "DocumentScope" NOT NULL DEFAULT 'PROJECT';

-- CreateIndex
CREATE INDEX "Document_scope_idx" ON "Document"("scope");

-- CreateIndex
CREATE INDEX "DocumentChunk_scope_idx" ON "DocumentChunk"("scope");
