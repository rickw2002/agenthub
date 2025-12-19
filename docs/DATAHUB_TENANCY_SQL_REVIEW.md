# Data Hub Tenancy SQL Review & Safe Execution Plan

## Current State Analysis

### Migration 1: `20251219170000_add_workspace_to_datahub_models`
- ✅ Adds nullable `workspaceId` columns to 4 tables
- ✅ Adds foreign key constraints (CASCADE delete)
- ✅ Creates indexes including **unique index** on `Connection(workspaceId, provider)`

### Migration 2: `20251219171000_datahub_workspace_not_null`
- ⚠️ Sets NOT NULL on all 4 `workspaceId` columns
- ⚠️ **Will fail if any NULL values exist**

---

## Critical Issue: Unique Index with NULLs

### Postgres Behavior
In Postgres, **NULL values are considered distinct** in unique indexes. This means:
- Multiple rows with `(NULL, provider)` are allowed in a unique index on `(workspaceId, provider)`
- This is **safe during transition** but **must be resolved before NOT NULL**

### Current Unique Constraint
```sql
CREATE UNIQUE INDEX "Connection_workspaceId_provider_key"
ON "Connection"("workspaceId", "provider");
```

**Risk**: If any rows have `workspaceId = NULL` with the same `provider`, the unique constraint will allow them. Once NOT NULL is enforced, this becomes a true unique constraint per workspace.

**Action Required**: Ensure all rows have `workspaceId` populated before enforcing NOT NULL.

---

## Proposed Safe SQL Migration

### Option A: Direct NOT NULL (if backfill is verified)

```sql
-- Migration: 20251219171000_datahub_workspace_not_null
-- PREREQUISITE: Run backfill script and verify no NULLs exist

-- Verify no NULLs exist (run this manually first, or as a check)
-- SELECT COUNT(*) FROM "Connection" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) FROM "MetricDaily" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) FROM "Insight" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) FROM "ChatMessage" WHERE "workspaceId" IS NULL;

-- Enforce NOT NULL (will fail if any NULLs exist)
ALTER TABLE "Connection"
ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "MetricDaily"
ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "Insight"
ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "ChatMessage"
ALTER COLUMN "workspaceId" SET NOT NULL;
```

### Option B: Safe Migration with Pre-check (Recommended for Production)

```sql
-- Migration: 20251219171000_datahub_workspace_not_null
-- This version includes safety checks

DO $$
DECLARE
  connection_nulls INTEGER;
  metric_nulls INTEGER;
  insight_nulls INTEGER;
  chat_nulls INTEGER;
BEGIN
  -- Count NULLs
  SELECT COUNT(*) INTO connection_nulls FROM "Connection" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO metric_nulls FROM "MetricDaily" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO insight_nulls FROM "Insight" WHERE "workspaceId" IS NULL;
  SELECT COUNT(*) INTO chat_nulls FROM "ChatMessage" WHERE "workspaceId" IS NULL;

  -- Fail if any NULLs exist
  IF connection_nulls > 0 OR metric_nulls > 0 OR insight_nulls > 0 OR chat_nulls > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL: NULL values found. Connection: %, MetricDaily: %, Insight: %, ChatMessage: %. Run backfill script first.',
      connection_nulls, metric_nulls, insight_nulls, chat_nulls;
  END IF;

  -- Enforce NOT NULL
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
```

---

## Index & Constraint Validity

### After NOT NULL Enforcement

✅ **Unique Index on Connection(workspaceId, provider)**
- **Before NOT NULL**: Allows multiple `(NULL, provider)` rows (Postgres behavior)
- **After NOT NULL**: Enforces true uniqueness per workspace+provider ✅

✅ **Foreign Key Constraints**
- Already enforced via `ON DELETE CASCADE`
- NOT NULL enforcement ensures referential integrity ✅

✅ **Other Indexes**
- All indexes on `workspaceId` remain valid
- No changes needed ✅

### Potential Issues

⚠️ **Duplicate Rows During Transition**
- If backfill script fails partially, you might have:
  - Multiple rows with `(NULL, provider)` for the same user
  - After backfill, these become `(workspaceId, provider)` duplicates
- **Solution**: Run backfill script idempotently (only updates where `workspaceId IS NULL`)

✅ **No Issues After NOT NULL**
- Once NOT NULL is enforced, the unique constraint works correctly
- All indexes are valid

---

## Safe Execution Order

### Development Environment

```bash
# 1. Apply first migration (adds nullable columns)
npx prisma migrate dev --name add_workspace_to_datahub_models

# 2. Backfill workspaceIds
npm run datahub:backfill-workspace

# 3. Verify no NULLs
npm run datahub:check-workspace

# 4. Apply NOT NULL migration
npx prisma migrate dev --name datahub_workspace_not_null

# 5. Regenerate Prisma client
npx prisma generate

# 6. Verify TypeScript compiles
npm run build
```

### Production/Staging Environment

```bash
# STEP 1: Deploy first migration (nullable columns)
npx prisma migrate deploy

# STEP 2: Backfill (run during low-traffic window)
npm run datahub:backfill-workspace

# STEP 3: Verify (critical - must pass)
npm run datahub:check-workspace
# Expected output: "✅ All Data Hub workspaceId values are backfilled (no NULLs)."
# If it fails, DO NOT proceed to step 4. Investigate and re-run backfill.

# STEP 4: Deploy NOT NULL migration (only after step 3 passes)
npx prisma migrate deploy

# STEP 5: Regenerate Prisma client
npx prisma generate

# STEP 6: Restart application (to pick up new Prisma types)
# (Your deployment process)
```

---

## Rollback Plan

### If NOT NULL Migration Fails

1. **Do NOT rollback the first migration** (nullable columns are safe)
2. **Investigate NULLs**:
   ```sql
   SELECT COUNT(*) FROM "Connection" WHERE "workspaceId" IS NULL;
   SELECT COUNT(*) FROM "MetricDaily" WHERE "workspaceId" IS NULL;
   SELECT COUNT(*) FROM "Insight" WHERE "workspaceId" IS NULL;
   SELECT COUNT(*) FROM "ChatMessage" WHERE "workspaceId" IS NULL;
   ```
3. **Re-run backfill**:
   ```bash
   npm run datahub:backfill-workspace
   ```
4. **Re-verify**:
   ```bash
   npm run datahub:check-workspace
   ```
5. **Retry NOT NULL migration** (if using Prisma, you may need to manually mark it as applied or create a new migration)

### If You Need to Rollback NOT NULL (Emergency)

```sql
-- WARNING: Only use in emergency. This makes workspaceId nullable again.
ALTER TABLE "Connection" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "MetricDaily" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "Insight" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "ChatMessage" ALTER COLUMN "workspaceId" DROP NOT NULL;
```

**Note**: After rollback, you'll need to update Prisma schema to make `workspaceId` optional again, or create a new migration.

---

## Warnings & Gotchas

### ⚠️ Gotcha 1: Unique Index with NULLs
- Postgres allows multiple NULLs in unique indexes
- This is **safe during transition** but must be resolved before NOT NULL
- **Solution**: Ensure backfill completes before NOT NULL migration

### ⚠️ Gotcha 2: Foreign Key Constraints
- FKs are already enforced (CASCADE delete)
- NOT NULL ensures referential integrity
- **No action needed**

### ⚠️ Gotcha 3: Concurrent Writes During Backfill
- If new rows are created during backfill, they might have `workspaceId = NULL`
- **Solution**: Backfill script should be idempotent and re-runnable
- Consider running during low-traffic window

### ⚠️ Gotcha 4: Application Code Must Set workspaceId
- After NOT NULL, all INSERTs must include `workspaceId`
- **Current code**: Already updated to set `workspaceId` ✅
- **Verify**: Check all Data Hub routes set `workspaceId` on create

### ✅ No Issues: Index Validity
- All indexes remain valid after NOT NULL
- Unique constraint becomes fully enforced (desired behavior)

---

## Final Recommendation

**Use Option B (Safe Migration with Pre-check)** for production. It will:
1. ✅ Verify no NULLs exist before attempting NOT NULL
2. ✅ Provide clear error messages if backfill is incomplete
3. ✅ Prevent silent failures
4. ✅ Make rollback easier (migration fails before changes)

**For development**, Option A is fine if you trust the backfill script.

---

## Verification Queries

After NOT NULL migration, verify:

```sql
-- Check NOT NULL is enforced
SELECT 
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('Connection', 'MetricDaily', 'Insight', 'ChatMessage')
  AND column_name = 'workspaceId';
-- Expected: is_nullable = 'NO' for all 4 tables

-- Check unique constraint is active
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'Connection'
  AND indexname LIKE '%workspaceId%provider%';
-- Expected: Unique index exists and is valid

-- Check no NULLs exist (should return 0 for all)
SELECT COUNT(*) FROM "Connection" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "MetricDaily" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Insight" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "ChatMessage" WHERE "workspaceId" IS NULL;
```

