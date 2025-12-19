-- Migration: Enforce NOT NULL on Data Hub workspaceId columns
-- PREREQUISITE: Run scripts/backfill-datahub-workspace.ts and verify with scripts/check-datahub-workspace-null.ts
--
-- This migration includes safety checks to prevent applying NOT NULL if NULL values exist.
-- If this migration fails, run the backfill script again and re-verify.

DO $$
DECLARE
  connection_nulls INTEGER;
  metric_nulls INTEGER;
  insight_nulls INTEGER;
  chat_nulls INTEGER;
BEGIN
  -- Count NULLs in each table
  SELECT COUNT(*) INTO connection_nulls FROM "Connection" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO metric_nulls FROM "MetricDaily" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO insight_nulls FROM "Insight" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO chat_nulls FROM "ChatMessage" WHERE "workspaceId" IS NULL;

  -- Fail migration if any NULLs exist
  IF connection_nulls > 0 OR metric_nulls > 0 OR insight_nulls > 0 OR chat_nulls > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL: NULL values found. Connection: %, MetricDaily: %, Insight: %, ChatMessage: %. Run backfill script first: npm run datahub:backfill-workspace',
      connection_nulls, metric_nulls, insight_nulls, chat_nulls;
  END IF;

  -- Enforce NOT NULL on all 4 tables
  ALTER TABLE "Connection"
  ALTER COLUMN "workspaceId" SET NOT NULL;

  ALTER TABLE "MetricDaily"
  ALTER COLUMN "workspaceId" SET NOT NULL;

  ALTER TABLE "Insight"
  ALTER COLUMN "workspaceId" SET NOT NULL;

  ALTER TABLE "ChatMessage"
  ALTER COLUMN "workspaceId" SET NOT NULL;

  RAISE NOTICE 'Successfully enforced NOT NULL on all Data Hub workspaceId columns.';
END $$;

