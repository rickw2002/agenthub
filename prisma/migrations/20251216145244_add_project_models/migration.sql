-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "useGlobalLibrary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectChat" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectChatMessage" (
    "id" TEXT NOT NULL,
    "projectChatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourcesJson" TEXT,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSettings_projectId_key" ON "ProjectSettings"("projectId");

-- CreateIndex
CREATE INDEX "ProjectChat_projectId_idx" ON "ProjectChat"("projectId");

-- CreateIndex
CREATE INDEX "ProjectChatMessage_projectChatId_idx" ON "ProjectChatMessage"("projectChatId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "DocumentChunk_projectId_idx" ON "DocumentChunk"("projectId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSettings" ADD CONSTRAINT "ProjectSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChat" ADD CONSTRAINT "ProjectChat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_projectChatId_fkey" FOREIGN KEY ("projectChatId") REFERENCES "ProjectChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
