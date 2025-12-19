# Data Hub userId Audit Report

**Date:** 2024-12-19  
**Purpose:** Find remaining Data Hub queries that still use `userId` instead of `workspaceId`

---

## Summary

Found **2 files** with Data Hub queries using `userId`:

1. **`app/api/chat/route.ts`** - Missing `workspaceId` in one ChatMessage.create
2. **`prisma/seed.ts`** - Multiple places using `userId` for queries and creates (seed script)

---

## Detailed Findings

### ✅ Already Fixed (Using workspaceId)

These files are **OK** and already use `workspaceId`:

- `app/api/data/overview/route.ts` - ✅ Uses `workspaceId`
- `app/api/data/channel/route.ts` - ✅ Uses `workspaceId`
- `app/api/data/connect/route.ts` - ✅ Uses `workspaceId`
- `app/api/data/disconnect/route.ts` - ✅ Uses `workspaceId`
- `app/(app)/data/page.tsx` - ✅ Uses `workspaceId`
- `app/(app)/data/[provider]/page.tsx` - ✅ Uses `workspaceId`
- `app/api/chat/route.ts` - ✅ Uses `workspaceId` for MetricDaily/Insight queries (lines 111, 131, 199, 209)
- `app/api/chat/route.ts` - ✅ Uses `workspaceId` for userMessage.create (line 91)

---

## ❌ Issues Found

### 1. `app/api/chat/route.ts` - Line 284-291

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

**Recommended Change:**
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

**Context:** This is Data Hub-related (chat messages for Data Hub). The `workspace` variable is already available in scope (line 27).

---

### 2. `prisma/seed.ts` - Multiple locations

**Context:** Seed script for creating test/demo Data Hub data. This is Data Hub-related but used only in development/testing.

#### 2a. Line 380-382 - Connection.findMany

**Current Code:**
```typescript
const existingConnections = await prisma.connection.findMany({
  where: { userId },
});
```

**Issue:** Querying by `userId` instead of `workspaceId`

**Recommended Change:**
```typescript
// Get workspace for user first
const workspace = await getOrCreateWorkspace(userId);

const existingConnections = await prisma.connection.findMany({
  where: { workspaceId: workspace.id },
});
```

**Note:** Requires importing `getOrCreateWorkspace` from `@/lib/workspace`

#### 2b. Line 400-407 - Connection.create

**Current Code:**
```typescript
await prisma.connection.create({
  data: {
    userId,
    provider,
    status,
    authJson: status === "CONNECTED" ? JSON.stringify({ connected: true, lastSync: new Date().toISOString() }) : null,
  },
});
```

**Issue:** Missing `workspaceId` field (required, NOT NULL)

**Recommended Change:**
```typescript
// Get workspace (should be done once at top of function)
const workspace = await getOrCreateWorkspace(userId);

await prisma.connection.create({
  data: {
    userId,
    workspaceId: workspace.id,  // ADD THIS
    provider,
    status,
    authJson: status === "CONNECTED" ? JSON.stringify({ connected: true, lastSync: new Date().toISOString() }) : null,
  },
});
```

#### 2c. Line 447-456 - MetricDaily.createMany data array

**Current Code:**
```typescript
metricsArray.push({
  userId,
  provider,
  date,
  metricsJson,
  dimensionsJson: JSON.stringify({...}),
});
```

**Issue:** Missing `workspaceId` field (required, NOT NULL)

**Recommended Change:**
```typescript
metricsArray.push({
  userId,
  workspaceId: workspace.id,  // ADD THIS
  provider,
  date,
  metricsJson,
  dimensionsJson: JSON.stringify({...}),
});
```

#### 2d. Line 538-550 - Insight.create

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
    dataRefJson: JSON.stringify({...}),
  },
});
```

**Issue:** Missing `workspaceId` field (required, NOT NULL)

**Recommended Change:**
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
    dataRefJson: JSON.stringify({...}),
  },
});
```

---

## Action Items

### High Priority (Will Break Production)

1. **Fix `app/api/chat/route.ts` line 284** - Missing `workspaceId` in assistantMessage.create
   - **Impact:** Will fail with NOT NULL constraint violation
   - **Fix:** Add `workspaceId: workspace.id` to data object

### Medium Priority (Seed Script - Development Only)

2. **Fix `prisma/seed.ts`** - Add `workspaceId` to all creates and update query
   - **Impact:** Seed script will fail if run after NOT NULL migration
   - **Fix:** 
     - Import `getOrCreateWorkspace` at top
     - Get workspace once at start of seed function
     - Add `workspaceId` to all Connection, MetricDaily, Insight creates
     - Update Connection.findMany query to use workspaceId

---

## Verification

After fixes, verify:

1. ✅ All Data Hub routes use `workspaceId` for queries
2. ✅ All Data Hub creates include `workspaceId`
3. ✅ Seed script works with workspace-tenancy
4. ✅ No TypeScript errors
5. ✅ `npm run build` succeeds

---

## Notes

- **Seed script (`prisma/seed.ts`):** While this is development-only, it should still follow the workspace-tenancy pattern for consistency and to work after NOT NULL migration.
- **Chat route:** The `workspace` variable is already available in scope, so fix is trivial.
- **All other Data Hub routes:** Already correctly using `workspaceId` ✅

