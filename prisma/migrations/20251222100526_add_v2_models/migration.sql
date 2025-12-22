-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightV2" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "observations" JSONB NOT NULL,
    "hypotheses" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraftV2" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "voiceCardVersion" JSONB NOT NULL,
    "basedOnInsightId" TEXT,
    "sources" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraftV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReportV2" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "scoreboard" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "decisions" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReportV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentFeedbackV2" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentDraftId" TEXT NOT NULL,
    "postedUrl" TEXT,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "reactions" INTEGER,
    "comments" INTEGER,
    "qualitativeRating" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFeedbackV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_workspaceId_type_idx" ON "Signal"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Signal_workspaceId_sourceProvider_idx" ON "Signal"("workspaceId", "sourceProvider");

-- CreateIndex
CREATE INDEX "Signal_workspaceId_periodStart_periodEnd_idx" ON "Signal"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "InsightV2_workspaceId_periodStart_periodEnd_idx" ON "InsightV2"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ContentDraftV2_workspaceId_idx" ON "ContentDraftV2"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentDraftV2_workspaceId_status_createdAt_idx" ON "ContentDraftV2"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDraftV2_basedOnInsightId_idx" ON "ContentDraftV2"("basedOnInsightId");

-- CreateIndex
CREATE INDEX "WeeklyReportV2_workspaceId_weekStart_weekEnd_idx" ON "WeeklyReportV2"("workspaceId", "weekStart", "weekEnd");

-- CreateIndex
CREATE INDEX "ContentFeedbackV2_workspaceId_idx" ON "ContentFeedbackV2"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentFeedbackV2_contentDraftId_idx" ON "ContentFeedbackV2"("contentDraftId");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightV2" ADD CONSTRAINT "InsightV2_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraftV2" ADD CONSTRAINT "ContentDraftV2_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraftV2" ADD CONSTRAINT "ContentDraftV2_basedOnInsightId_fkey" FOREIGN KEY ("basedOnInsightId") REFERENCES "InsightV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReportV2" ADD CONSTRAINT "WeeklyReportV2_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFeedbackV2" ADD CONSTRAINT "ContentFeedbackV2_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFeedbackV2" ADD CONSTRAINT "ContentFeedbackV2_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "ContentDraftV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
