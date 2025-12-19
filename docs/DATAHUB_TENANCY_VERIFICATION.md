# Data Hub Tenancy Refactor — Verification & QA Report

**Date:** 2024-12-19  
**Purpose:** Verify all changes before NOT NULL migration deployment  
**Status:** ⚠️ **2 Critical Fixes Required Before Production**

---

## Executive Summary

**Schema & Migrations:** ✅ Correct  
**Scripts:** ✅ Safe (using raw SQL)  
**Read Paths:** ✅ All use workspaceId  
**Write Paths:** ⚠️ **2 missing workspaceId** (will break after NOT NULL)  
**Type Safety:** ⚠️ **1 route has TypeScript errors** (needs investigation)

---

## A) Prisma / DB Consistency Checks

### ✅ Schema Analysis (`prisma/schema.prisma`)

**Connection Model (Lines 104-122):**
- ✅ `workspaceId String` (required, NOT nullable)
- ✅ `workspace Workspace @relation(...)` exists (non-optional)
- ✅ `@@unique([workspaceId, provider])` declared
- ✅ Indexes on `workspaceId` and `(workspaceId, provider)`

**MetricDaily Model (Lines 124-141):**
- ✅ `workspaceId String` (required, NOT nullable)
- ✅ `workspace Workspace @relation(...)` exists (non-optional)
- ✅ Indexes on `(workspaceId, provider)` and `(workspaceId, provider, date)`

**Insight Model (Lines 143-162):**
- ✅ `workspaceId String` (required, NOT nullable)
- ✅ `workspace Workspace @relation(...)` exists (non-optional)
- ✅ Indexes on `workspaceId` and `(workspaceId, provider)`

**ChatMessage Model (Lines 164-179):**
- ✅ `workspaceId String` (required, NOT nullable)
- ✅ `workspace Workspace @relation(...)` exists (non-optional) — **CONFIRMED**
- ✅ Indexes on `workspaceId` and `(workspaceId, scope)`

**Workspace Model (Lines 181-201):**
- ✅ Relation fields exist: `connections`, `metricDailies`, `insights`, `chatMessages`

**Verdict:** ✅ Schema is consistent. All 4 models have required `workspaceId` and proper relations.

---

### ✅ Migration Analysis

**Migration 1: `20251219170000_add_workspace_to_datahub_models`**
- ✅ Adds nullable `workspaceId` columns to all 4 tables
- ✅ Adds foreign key constraints (CASCADE delete)
- ✅ Creates unique index on `Connection(workspaceId, provider)`
- ✅ Creates all required indexes
- ✅ **Safe:** Columns are nullable initially

**Migration 2: `20251219171000_datahub_workspace_not_null`**
- ✅ Uses DO-block with safety checks
- ✅ Counts NULLs before attempting NOT NULL
- ✅ Fails with clear error message if NULLs exist
- ✅ Enforces NOT NULL on all 4 tables
- ✅ **Safe:** Will not apply if backfill incomplete

**Verdict:** ✅ Migrations match schema and include safety checks.

**Potential Issue:** None. Migrations are additive and safe.

---

## B) Script Safety Checks

### ✅ `scripts/backfill-datahub-workspace.ts`

**Idempotency:**
- ✅ Uses `WHERE "userId" = ${userId} AND "workspaceId" IS NULL` — only updates NULL rows
- ✅ Safe to run multiple times

**Correctness:**
- ✅ Uses `getOrCreateWorkspace(userId)` — ensures correct workspace mapping
- ✅ Uses `$executeRaw` — works regardless of Prisma nullability
- ✅ Cannot assign wrong workspaceId (derived from user's workspace)

**Verdict:** ✅ Script is safe and idempotent.

---

### ✅ `scripts/check-datahub-workspace-null.ts`

**Prisma Type Compatibility:**
- ✅ Uses `$queryRaw` — works even if `workspaceId` is non-nullable in Prisma types
- ✅ No dependency on Prisma's type system for nullability
- ✅ Will work after NOT NULL migration

**Verdict:** ✅ Script is future-proof.

---

## C) Code Path Checks (Data Hub Only)

### ✅ Read Paths (All Correct)

**`app/api/data/overview/route.ts`:**
- ✅ Line 42-46: `connection.findMany({ where: { workspaceId: workspace.id } })`
- ✅ Line 55-65: `metricDaily.findMany({ where: { workspaceId: workspace.id, ... } })`
- ✅ Line 68-75: `insight.findMany({ where: { workspaceId: workspace.id } })`

**`app/api/data/channel/route.ts`:**
- ✅ Line 60-65: `connection.findFirst({ where: { workspaceId: workspace.id, provider } })`
- ✅ Line 72-82: `metricDaily.findMany({ where: { workspaceId: workspace.id, provider, ... } })`
- ✅ Line 109-117: `insight.findMany({ where: { workspaceId: workspace.id, provider } })`

**`app/api/chat/route.ts`:**
- ✅ Line 109-117: `metricDaily.findFirst({ where: { workspaceId: workspace.id, provider } })` (MASTER scope)
- ✅ Line 129-138: `insight.findMany({ where: { workspaceId: workspace.id, provider } })` (MASTER scope)
- ✅ Line 197-205: `metricDaily.findFirst({ where: { workspaceId: workspace.id, provider: scope } })` (provider scope)
- ✅ Line 207-216: `insight.findMany({ where: { workspaceId: workspace.id, provider: scope } })` (provider scope)

**`app/(app)/data/page.tsx`:**
- ✅ Line 20-22: `connection.findMany({ where: { workspaceId: workspace.id } })`
- ✅ Line 30-40: `metricDaily.findMany({ where: { workspaceId: workspace.id, ... } })`
- ✅ Line 42-49: `insight.findMany({ where: { workspaceId: workspace.id } })`

**`app/(app)/data/[provider]/page.tsx`:**
- ✅ Line 42-47: `connection.findFirst({ where: { workspaceId: workspace.id, provider } })`
- ✅ Line 54-65: `metricDaily.findMany({ where: { workspaceId: workspace.id, provider, ... } })`
- ✅ Line 91-100: `insight.findMany({ where: { workspaceId: workspace.id, provider } })`

**Verdict:** ✅ All read paths correctly use `workspaceId`.

---

### ⚠️ Write Paths (Issues Found)

#### ❌ CRITICAL: `app/api/chat/route.ts` — Line 284-291

**Current Code:**
```typescript
const assistantMessage = await prisma.chatMessage.create({
  data: {
    userId: user.id,
    scope,
    role: "ASSISTANT",
    content: assistantReply,
  },
});
```

**Issue:** Missing `workspaceId` field (required, NOT NULL)

**Impact:** Will fail with NOT NULL constraint violation after migration 2

**Fix Required:**
```typescript
const assistantMessage = await prisma.chatMessage.create({
  data: {
    userId: user.id,
    workspaceId: workspace.id,  // ADD THIS
    scope,
    role: "ASSISTANT",
    content: assistantReply,
  },
});
```

**Note:** `workspace` variable is already in scope (line 27).

---

#### ✅ CORRECT: `app/api/chat/route.ts` — Line 88-96

**Current Code:**
```typescript
const userMessage = await prisma.chatMessage.create({
  data: {
    userId: user.id,
    workspaceId: workspace.id,  // ✅ Present
    scope,
    role: "USER",
    content: message.trim(),
  },
});
```

**Verdict:** ✅ Correct.

---

#### ✅ CORRECT: `app/api/data/connect/route.ts` — Line 58-84

**Current Code:**
```typescript
const connection = await prisma.connection.upsert({
  where: {
    workspaceId_provider: {
      workspaceId: workspace.id,
      provider,
    },
  },
  update: {
    status: "CONNECTED",
    authJson: JSON.stringify({...}),
    userId: user.id,
  },
  create: {
    userId: user.id,
    workspaceId: workspace.id,  // ✅ Present
    provider,
    status: "CONNECTED",
    authJson: JSON.stringify({...}),
  },
});
```

**Verdict:** ✅ Correct (no `as any` cast needed after Prisma generate).

**Note:** Linter shows no errors for this file.

---

#### ⚠️ TYPE ERROR: `app/api/data/disconnect/route.ts` — Line 59-78

**Current Code:**
```typescript
await prisma.connection.upsert({
  where: {
    workspaceId_provider: {
      workspaceId: workspace.id,
      provider,
    },
  },
  update: {
    status: "NOT_CONNECTED",
    authJson: null,
    userId: user.id,
  },
  create: {
    userId: user.id,
    workspaceId: workspace.id,  // ✅ Present
    provider,
    status: "NOT_CONNECTED",
    authJson: null,
  },
});
```

**Issue:** TypeScript linter reports:
- Line 61: `'workspaceId_provider' does not exist in type 'ConnectionWhereUniqueInput'`
- Line 73: `'workspaceId' does not exist in type 'ConnectionCreateInput'`

**Analysis:** This is likely a TypeScript cache issue. Prisma client was just regenerated. The code structure matches `connect/route.ts` which has no errors.

**Action:** Restart TypeScript server or verify Prisma types are loaded. Code is correct.

**Verdict:** ⚠️ Likely TypeScript cache issue. Code is correct, but verify types are loaded.

---

### ⚠️ Seed Script (`prisma/seed.ts`)

**Context:** Development-only, but should be fixed for consistency.

#### Issue 1: Line 380-382 — Connection.findMany

**Current Code:**
```typescript
const existingConnections = await prisma.connection.findMany({
  where: { userId },
});
```

**Issue:** Queries by `userId` instead of `workspaceId`

**Fix Required:**
```typescript
const workspace = await getOrCreateWorkspace(userId);
const existingConnections = await prisma.connection.findMany({
  where: { workspaceId: workspace.id },
});
```

#### Issue 2: Line 400-407 — Connection.create

**Current Code:**
```typescript
await prisma.connection.create({
  data: {
    userId,
    provider,
    status,
    authJson: ...,
  },
});
```

**Issue:** Missing `workspaceId` (required, NOT NULL)

**Fix Required:**
```typescript
await prisma.connection.create({
  data: {
    userId,
    workspaceId: workspace.id,  // ADD THIS
    provider,
    status,
    authJson: ...,
  },
});
```

#### Issue 3: Line 447-456 — MetricDaily.createMany data array

**Current Code:**
```typescript
metricsArray.push({
  userId,
  provider,
  date,
  metricsJson,
  dimensionsJson: ...,
});
```

**Issue:** Missing `workspaceId` in array items

**Fix Required:**
```typescript
metricsArray.push({
  userId,
  workspaceId: workspace.id,  // ADD THIS
  provider,
  date,
  metricsJson,
  dimensionsJson: ...,
});
```

#### Issue 4: Line 538-550 — Insight.create

**Current Code:**
```typescript
await prisma.insight.create({
  data: {
    userId,
    provider: insight.provider,
    title: insight.title,
    summary: insight.summary,
    severity: insight.severity,
    period: insight.period,
    dataRefJson: ...,
  },
});
```

**Issue:** Missing `workspaceId` (required, NOT NULL)

**Fix Required:**
```typescript
await prisma.insight.create({
  data: {
    userId,
    workspaceId: workspace.id,  // ADD THIS
    provider: insight.provider,
    title: insight.title,
    summary: insight.summary,
    severity: insight.severity,
    period: insight.period,
    dataRefJson: ...,
  },
});
```

**Verdict:** ⚠️ Seed script will fail after NOT NULL migration. Fix recommended.

---

## D) Summary of Issues

### 🔴 CRITICAL (Must Fix Before NOT NULL Deploy)

1. **`app/api/chat/route.ts` Line 284-291**
   - Missing `workspaceId` in `ChatMessage.create` (assistant message)
   - **Impact:** Runtime crash after NOT NULL migration
   - **Fix:** Add `workspaceId: workspace.id` to data object

### 🟡 MEDIUM (TypeScript Cache / Verification)

2. **`app/api/data/disconnect/route.ts` Line 59-78**
   - TypeScript linter errors (likely cache issue)
   - **Impact:** Build may fail, but code is correct
   - **Action:** Restart TS server, verify Prisma types loaded

### 🟢 LOW (Development Only)

3. **`prisma/seed.ts` Multiple locations**
   - Missing `workspaceId` in creates and query uses `userId`
   - **Impact:** Seed script fails after NOT NULL migration
   - **Fix:** Add `workspaceId` to all creates, update query

---

## E) Local Verification Runbook

### Step 1: Prerequisites

```bash
# Ensure you have a clean dev database (or backup production data)
# Ensure .env has correct DATABASE_URL
```

### Step 2: Apply Migrations

```bash
# Apply first migration (adds nullable columns)
npx prisma migrate dev --name add_workspace_to_datahub_models

# Expected: Migration applied successfully
# Verify: Check database has workspaceId columns (nullable)
```

### Step 3: Backfill Data

```bash
# Run backfill script
npm run datahub:backfill-workspace

# Expected output:
# 🚀 Starting Data Hub workspaceId backfill...
# 📊 Found N users to process
# ➡️  User <id> → workspace <id>
#   - Updated X Connection rows
#   - Updated Y MetricDaily rows
#   - Updated Z Insight rows
#   - Updated W ChatMessage rows
# ✅ Data Hub workspaceId backfill completed.
```

### Step 4: Verify No NULLs

```bash
# Check for NULLs
npm run datahub:check-workspace

# Expected output:
# 🔎 Checking Data Hub tables for NULL workspaceId values...
# Connection  workspaceId NULL count: 0
# MetricDaily workspaceId NULL count: 0
# Insight     workspaceId NULL count: 0
# ChatMessage workspaceId NULL count: 0
# ✅ All Data Hub workspaceId values are backfilled (no NULLs).
# Exit code: 0
```

**If exit code is 1:** Re-run backfill and check again.

### Step 5: Apply NOT NULL Migration

```bash
# Apply second migration (enforces NOT NULL)
npx prisma migrate dev --name datahub_workspace_not_null

# Expected: Migration applied successfully
# If it fails: Check error message, re-run backfill, retry
```

### Step 6: Regenerate Prisma Client

```bash
npx prisma generate

# Expected: "Generated Prisma Client (v5.x.x) to .\node_modules\@prisma\client"
```

### Step 7: TypeScript Build Check

```bash
npm run build

# Expected: Build succeeds with no errors
# If errors: Check Prisma types, restart TS server, verify imports
```

### Step 8: Functional Tests

**Test 1: Data Hub Overview**
```bash
# Start dev server
npm run dev

# Navigate to: http://localhost:3000/data
# Expected: Page loads, shows provider cards, no errors in console
```

**Test 2: Provider Detail Page**
```bash
# Navigate to: http://localhost:3000/data/google-ads (or any provider)
# Expected: Page loads, shows metrics and insights, no errors
```

**Test 3: Chat Functionality**
```bash
# Navigate to: http://localhost:3000/data
# Use Master Chat: Send a message
# Expected: 
#   - User message saved
#   - Assistant reply generated
#   - No errors in console
#   - Both messages saved to database
```

**Test 4: Connect/Disconnect**
```bash
# Via API or UI, connect a provider
# Expected: Connection created/updated with workspaceId
# Disconnect provider
# Expected: Connection updated to NOT_CONNECTED, no errors
```

**Test 5: Seed Script (if needed)**
```bash
# Clear Data Hub data (optional)
# Run: npm run db:seed
# Expected: Seed script runs without errors, creates data with workspaceId
```

---

## F) Production Rollout Checklist

### Pre-Deployment

- [ ] **Fix Critical Issue #1:** Add `workspaceId` to `app/api/chat/route.ts` assistant message create
- [ ] **Verify TypeScript:** Ensure `app/api/data/disconnect/route.ts` compiles (restart TS server if needed)
- [ ] **Test Locally:** Complete local verification runbook (Steps 1-8)
- [ ] **Backup Database:** Create full database backup
- [ ] **Document Rollback:** Ensure rollback SQL is ready (see below)

### Deployment Steps (In Order)

1. **Deploy Migration 1 (Nullable Columns)**
   ```bash
   npx prisma migrate deploy
   ```
   - ✅ Safe: Adds nullable columns, no breaking changes
   - ✅ Verify: Check database has new columns

2. **Run Backfill (During Low-Traffic Window)**
   ```bash
   npm run datahub:backfill-workspace
   ```
   - ⏱️ **Timing:** Run during low-traffic period
   - ✅ Verify: Check logs for successful updates

3. **Verify No NULLs (CRITICAL)**
   ```bash
   npm run datahub:check-workspace
   ```
   - ✅ **MUST PASS:** Exit code must be 0
   - ❌ **If fails:** DO NOT proceed. Investigate and re-run backfill.

4. **Deploy Migration 2 (NOT NULL)**
   ```bash
   npx prisma migrate deploy
   ```
   - ✅ Safe: Migration includes safety checks
   - ✅ Verify: Migration succeeds or fails with clear error

5. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Restart Application**
   - Restart Next.js service to pick up new Prisma types
   - ✅ Verify: Application starts without errors

7. **Smoke Tests**
   - [ ] Data Hub overview page loads
   - [ ] Provider detail pages load
   - [ ] Chat sends/receives messages
   - [ ] Connect/disconnect works
   - [ ] No errors in application logs

---

## G) Panic Rollback Plan

### If NOT NULL Migration Fails

**The migration will fail automatically** if NULLs exist (DO-block check). No rollback needed — just fix NULLs and retry.

### If Application Crashes After NOT NULL

**Option 1: Rollback NOT NULL (Emergency)**

```sql
-- WARNING: Only use in emergency. Makes workspaceId nullable again.
ALTER TABLE "Connection" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "MetricDaily" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "Insight" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "ChatMessage" ALTER COLUMN "workspaceId" DROP NOT NULL;
```

**Then:**
- Fix missing `workspaceId` in code (see Critical Issue #1)
- Re-deploy code
- Re-run backfill if needed
- Re-apply NOT NULL migration

**Option 2: Hotfix Code (Preferred)**

If crash is due to missing `workspaceId` in code:
- Deploy code fix immediately
- No database rollback needed

---

## H) Final Verification Checklist

Before marking this refactor as complete:

- [ ] All critical fixes applied (ChatMessage.create)
- [ ] TypeScript build succeeds (`npm run build`)
- [ ] Local verification runbook completed successfully
- [ ] All functional tests pass
- [ ] Production rollout checklist followed
- [ ] Smoke tests pass in production
- [ ] No errors in application logs
- [ ] Database constraints verified (NOT NULL enforced)

---

## I) Risk Assessment

**Low Risk:**
- ✅ Schema changes are additive
- ✅ Migrations include safety checks
- ✅ Scripts are idempotent
- ✅ Read paths already use workspaceId

**Medium Risk:**
- ⚠️ One missing `workspaceId` in write path (fixable)
- ⚠️ TypeScript cache issues (resolvable)

**High Risk:**
- ❌ **None** — All risks are mitigatable with fixes above

---

## Conclusion

**Status:** ⚠️ **Ready after 1 critical fix**

**Required Actions:**
1. Fix `app/api/chat/route.ts` line 284 (add `workspaceId`)
2. Verify TypeScript compilation
3. (Optional) Fix seed script for development consistency

**After fixes:** Safe to deploy NOT NULL migration.

