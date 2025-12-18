-- CreateEnum
CREATE TYPE "ExampleKind" AS ENUM ('good', 'bad');

-- CreateEnum
CREATE TYPE "OutputChannel" AS ENUM ('linkedin', 'blog');

-- CreateEnum
CREATE TYPE "OutputMode" AS ENUM ('thought_to_post', 'brainstorm', 'batch_qa', 'content_bank');

-- CreateTable
CREATE TABLE "ProfileAnswer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "questionKey" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "answerJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileState" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "knownKeys" JSONB,
    "missingKeys" JSONB,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastQuestionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileCard" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "version" INTEGER NOT NULL,
    "voiceCard" JSONB NOT NULL,
    "audienceCard" JSONB NOT NULL,
    "offerCard" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "ExampleKind" NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "channel" "OutputChannel" NOT NULL,
    "mode" "OutputMode" NOT NULL,
    "inputJson" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "quality" JSONB,
    "tokensUsed" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "promptVersion" TEXT,
    "modelName" TEXT,
    "specVersion" TEXT,
    "profileCardVersion" INTEGER,
    "rewriteCount" INTEGER,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileAnswer_workspaceId_idx" ON "ProfileAnswer"("workspaceId");

-- CreateIndex
CREATE INDEX "ProfileAnswer_projectId_idx" ON "ProfileAnswer"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileAnswer_workspaceId_projectId_questionKey_key" ON "ProfileAnswer"("workspaceId", "projectId", "questionKey");

-- CreateIndex
CREATE INDEX "ProfileState_workspaceId_idx" ON "ProfileState"("workspaceId");

-- CreateIndex
CREATE INDEX "ProfileState_projectId_idx" ON "ProfileState"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileState_workspaceId_projectId_key" ON "ProfileState"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "ProfileCard_workspaceId_idx" ON "ProfileCard"("workspaceId");

-- CreateIndex
CREATE INDEX "ProfileCard_projectId_idx" ON "ProfileCard"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCard_workspaceId_projectId_version_key" ON "ProfileCard"("workspaceId", "projectId", "version");

-- CreateIndex
CREATE INDEX "Example_workspaceId_idx" ON "Example"("workspaceId");

-- CreateIndex
CREATE INDEX "Example_projectId_idx" ON "Example"("projectId");

-- CreateIndex
CREATE INDEX "Example_workspaceId_kind_idx" ON "Example"("workspaceId", "kind");

-- CreateIndex
CREATE INDEX "Output_workspaceId_idx" ON "Output"("workspaceId");

-- CreateIndex
CREATE INDEX "Output_projectId_idx" ON "Output"("projectId");

-- CreateIndex
CREATE INDEX "Output_workspaceId_channel_mode_createdAt_idx" ON "Output"("workspaceId", "channel", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_outputId_idx" ON "Feedback"("outputId");

-- AddForeignKey
ALTER TABLE "ProfileAnswer" ADD CONSTRAINT "ProfileAnswer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAnswer" ADD CONSTRAINT "ProfileAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileState" ADD CONSTRAINT "ProfileState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileState" ADD CONSTRAINT "ProfileState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCard" ADD CONSTRAINT "ProfileCard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCard" ADD CONSTRAINT "ProfileCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "Output"("id") ON DELETE CASCADE ON UPDATE CASCADE;
