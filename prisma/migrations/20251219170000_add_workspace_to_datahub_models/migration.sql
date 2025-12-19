-- Add nullable workspaceId columns to Data Hub models and create indexes

-- Connection: add workspaceId and relation to Workspace
ALTER TABLE "Connection"
ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "Connection"
ADD CONSTRAINT "Connection_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MetricDaily: add workspaceId and relation to Workspace
ALTER TABLE "MetricDaily"
ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "MetricDaily"
ADD CONSTRAINT "MetricDaily_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insight: add workspaceId and relation to Workspace
ALTER TABLE "Insight"
ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "Insight"
ADD CONSTRAINT "Insight_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatMessage: add workspaceId and relation to Workspace
ALTER TABLE "ChatMessage"
ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes and unique constraints for workspace-based tenancy

-- Connection
CREATE UNIQUE INDEX IF NOT EXISTS "Connection_workspaceId_provider_key"
ON "Connection"("workspaceId", "provider");

CREATE INDEX IF NOT EXISTS "Connection_workspaceId_idx"
ON "Connection"("workspaceId");

CREATE INDEX IF NOT EXISTS "Connection_workspaceId_provider_idx"
ON "Connection"("workspaceId", "provider");

-- MetricDaily
CREATE INDEX IF NOT EXISTS "MetricDaily_workspaceId_provider_idx"
ON "MetricDaily"("workspaceId", "provider");

CREATE INDEX IF NOT EXISTS "MetricDaily_workspaceId_provider_date_idx"
ON "MetricDaily"("workspaceId", "provider", "date");

-- Insight
CREATE INDEX IF NOT EXISTS "Insight_workspaceId_idx"
ON "Insight"("workspaceId");

CREATE INDEX IF NOT EXISTS "Insight_workspaceId_provider_idx"
ON "Insight"("workspaceId", "provider");

-- ChatMessage
CREATE INDEX IF NOT EXISTS "ChatMessage_workspaceId_idx"
ON "ChatMessage"("workspaceId");

CREATE INDEX IF NOT EXISTS "ChatMessage_workspaceId_scope_idx"
ON "ChatMessage"("workspaceId", "scope");


