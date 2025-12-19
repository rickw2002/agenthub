# Data Hub Release Checklist

**Quick reference for Data Hub workspace tenancy deployment**

---

## Recovery (If Migration Failed)

```bash
# 1. Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back 20251219171000_datahub_workspace_not_null

# 2. Backfill workspaceIds
npm run datahub:backfill-workspace

# 3. Verify no NULLs (MUST pass - exit code 0)
npm run datahub:check-workspace

# 4. Deploy NOT NULL migration
npx prisma migrate deploy

# 5. Regenerate Prisma client
npx prisma generate

# 6. Verify build
npm run build
```

---

## Normal Deployment (Clean State)

```bash
# 1. Deploy migration #1 (nullable columns)
npx prisma migrate deploy

# 2. Backfill workspaceIds
npm run datahub:backfill-workspace

# 3. Verify no NULLs (MUST pass)
npm run datahub:check-workspace

# 4. Deploy migration #2 (NOT NULL)
npx prisma migrate deploy

# 5. Regenerate Prisma client
npx prisma generate

# 6. Build & deploy application
npm run build
```

---

## 5-Minute Smoke Test

### 1. Data Hub Overview
- [ ] Navigate to `/data`
- [ ] Page loads without errors
- [ ] Provider cards visible (Google Ads, Meta Ads, LinkedIn, etc.)
- [ ] Metrics display correctly

### 2. Provider Detail Page
- [ ] Click any provider card (e.g., Google Ads)
- [ ] Detail page loads (`/data/google-ads`)
- [ ] Metrics chart visible
- [ ] Insights list visible

### 3. Chat Functionality
- [ ] Use Master Chat on `/data` page
- [ ] Send a message (e.g., "Show me my data")
- [ ] Assistant reply appears
- [ ] No errors in browser console

### 4. Connect/Disconnect (Optional)
- [ ] Click "Connect" on a provider
- [ ] Connection status updates
- [ ] Click "Disconnect"
- [ ] Status updates to "Not Connected"

### 5. Application Logs
- [ ] Check application logs for errors
- [ ] No database constraint violations
- [ ] No Prisma errors related to workspaceId

**Expected time:** 5 minutes  
**Pass criteria:** All checks pass, no errors in console/logs

---

## ⚠️ Do NOT Re-Run Unnecessarily

**These commands are idempotent but slow/unnecessary if already done:**

- ❌ **`npm run datahub:backfill-workspace`** — Only run if:
  - Migration #1 was just applied
  - You have new users/data without workspaceId
  - Check script found NULLs

- ❌ **`npx prisma migrate deploy`** — Only run if:
  - New migrations exist
  - Migrations are pending (`npx prisma migrate status` shows pending)

- ❌ **`npx prisma generate`** — Only run if:
  - Schema changed
  - After migrations
  - Prisma types are out of sync

**Safe to re-run:**
- ✅ `npm run datahub:check-workspace` — Fast, always safe
- ✅ `npm run build` — Always safe (verification)
- ✅ `npx prisma migrate status` — Read-only, always safe

---

## Quick Status Check

```bash
# Check migration status
npx prisma migrate status

# Check for NULLs
npm run datahub:check-workspace

# Verify build
npm run build
```

**Expected output:**
- `migrate status`: "Database schema is up to date!"
- `check-workspace`: "✅ All Data Hub workspaceId values are backfilled (no NULLs)."
- `build`: "Compiled successfully"

---

## Emergency Rollback

**If NOT NULL migration fails (has safety checks, but just in case):**

```sql
-- Connect to database
psql $DATABASE_URL

-- Make workspaceId nullable again (emergency only)
ALTER TABLE "Connection" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "MetricDaily" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "Insight" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "ChatMessage" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- Mark migration as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20251219171000_datahub_workspace_not_null';
```

**Then:** Fix NULLs, re-run backfill, re-deploy NOT NULL migration.

---

**Last updated:** 2024-12-19

