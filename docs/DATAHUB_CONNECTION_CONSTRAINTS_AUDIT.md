# Connection Constraints Audit - Multiple Accounts Support

**Date:** 2024-12-19  
**Purpose:** Verify if multiple accounts per provider per workspace is safe via authJson

---

## A) Current Constraints + What They Imply

### Prisma Schema Constraints

**File:** `prisma/schema.prisma` (lines 116-121)

```prisma
model Connection {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  provider    String
  status      String
  authJson    String?  // JSON stored as string
  ...
  
  @@unique([userId, provider])
  @@index([userId])
  @@index([userId, provider])
  @@unique([workspaceId, provider])
  @@index([workspaceId])
  @@index([workspaceId, provider])
}
```

**Constraints:**
1. `@@unique([userId, provider])` - One Connection per user per provider
2. `@@unique([workspaceId, provider])` - One Connection per workspace per provider

**What they imply:**
- ✅ **One Connection row per provider per workspace** (enforced by `workspaceId_provider` unique)
- ✅ **Multiple accounts can be stored in `authJson.selectedAccountIds`** (no constraint on JSON content)
- ✅ **No schema change needed** - `authJson` is `String?`, can store any JSON structure

**Example:**
- Workspace A + `GOOGLE_ANALYTICS` → 1 Connection row
- `authJson.selectedAccountIds.googleAnalytics` can be array: `["property-1", "property-2", "property-3"]`
- ✅ Allowed by constraints

---

## B) Whether Multiple Accounts via authJson is Safe

**✅ YES - Safe to store multiple accounts in authJson**

**Rationale:**
1. **No constraint violation:** `@@unique([workspaceId, provider])` only enforces one Connection row, not one account
2. **JSON is flexible:** `authJson` is `String?`, can store any JSON structure
3. **No parsing in current code:** No code currently parses `authJson` (see section C)
4. **Upsert pattern safe:** Current upsert uses `workspaceId_provider` key, doesn't touch `authJson` structure

**Proposed authJson structure:**
```typescript
interface ConnectionAuthJson {
  // OAuth tokens
  access_token: string;  // Encrypted
  refresh_token: string;  // Encrypted
  expires_at: number;
  
  // Multiple accounts per provider (array support)
  selectedAccountIds?: {
    googleAnalytics?: string[];  // Array of GA4 property IDs
    googleAds?: string[];         // Array of Google Ads customer IDs
    metaAds?: string[];           // Array of Meta ad account IDs
    linkedin?: string[];          // Array of LinkedIn account IDs
  };
  
  // Or single account (backward compatible)
  // googleAnalytics?: string;  // Single property ID (if only one selected)
  
  // Metadata
  connectedAt: string;
  lastSyncAt?: string;
}
```

**Decision:** Use arrays for `selectedAccountIds` to support multiple accounts. Sync logic can aggregate metrics from all selected accounts.

---

## C) Breaking Assumptions in UI/API

### C1. Connect/Disconnect Routes

**File:** `app/api/data/connect/route.ts` (line 58-84)
- **Current:** Upserts Connection, sets `authJson: { connected: true, connectedAt: ... }`
- **Assumption:** None - doesn't read `authJson`, only writes
- **Impact:** ✅ Safe - can store multiple accounts in `authJson`

**File:** `app/api/data/disconnect/route.ts` (line 59-78)
- **Current:** Sets `authJson: null` on disconnect
- **Assumption:** None - clears entire `authJson`
- **Impact:** ✅ Safe - no assumptions about structure

---

### C2. Overview/Channel Routes

**File:** `app/api/data/overview/route.ts` (line 42-46)
- **Current:** `prisma.connection.findMany({ where: { workspaceId } })`
- **Assumption:** One Connection per provider (enforced by constraint)
- **Impact:** ✅ Safe - constraint ensures one row, multiple accounts in `authJson` is fine

**File:** `app/api/data/channel/route.ts` (line 60-65)
- **Current:** `prisma.connection.findFirst({ where: { workspaceId, provider } })`
- **Assumption:** One Connection per provider (enforced by constraint)
- **Impact:** ✅ Safe - `findFirst` returns one row, doesn't parse `authJson`

**File:** `app/(app)/data/page.tsx` (line 20-22)
- **Current:** `prisma.connection.findMany({ where: { workspaceId } })`
- **Assumption:** One Connection per provider
- **Impact:** ✅ Safe - same as overview route

**File:** `app/(app)/data/[provider]/page.tsx` (line 42-47)
- **Current:** `prisma.connection.findFirst({ where: { workspaceId, provider } })`
- **Assumption:** One Connection per provider
- **Impact:** ✅ Safe - same as channel route

---

### C3. UI Components

**File:** `components/ChannelCard.tsx`
- **Current:** Shows connection status, doesn't read `authJson`
- **Assumption:** None about account count
- **Impact:** ✅ Safe - no changes needed

**File:** `components/ChannelDetailContent.tsx`
- **Current:** Shows metrics, doesn't read `authJson`
- **Assumption:** None about account count
- **Impact:** ✅ Safe - no changes needed

---

### C4. Chat Route

**File:** `app/api/chat/route.ts`
- **Current:** Queries `MetricDaily` and `Insight` by `workspaceId` and `provider`
- **Assumption:** Metrics aggregated per provider (not per account)
- **Impact:** ✅ Safe - `MetricDaily` already aggregates by provider, multiple accounts just add more data points

---

### C5. authJson Parsing

**Search results:** No code currently parses `authJson` in the codebase.

**Files checked:**
- `app/api/data/connect/route.ts` - Only writes `authJson`
- `app/api/data/disconnect/route.ts` - Only clears `authJson`
- `app/api/data/overview/route.ts` - Doesn't read `authJson`
- `app/api/data/channel/route.ts` - Doesn't read `authJson`
- `app/(app)/data/page.tsx` - Doesn't read `authJson`
- `app/(app)/data/[provider]/page.tsx` - Doesn't read `authJson`

**Impact:** ✅ **No breaking assumptions** - `authJson` is currently write-only in connect/disconnect routes.

---

## D) Minimal Change List (if blocking)

**✅ No blocking changes needed.**

**Optional improvements (not required):**

1. **FastAPI sync logic** - When reading `authJson.selectedAccountIds`, handle both:
   - Single account: `googleAnalytics: "property-123"` (backward compatible)
   - Multiple accounts: `googleAnalytics: ["property-123", "property-456"]` (new)

2. **Account selection UI** - Allow selecting multiple accounts (checkbox list instead of radio)

3. **MetricDaily aggregation** - Sync logic should aggregate metrics from all selected accounts into one daily row per provider

**Example sync logic (FastAPI):**
```python
# Read authJson
auth = json.loads(connection.auth_json)
account_ids = auth.get("selectedAccountIds", {}).get("googleAnalytics", [])

# Handle both single and array
if isinstance(account_ids, str):
    account_ids = [account_ids]  # Convert single to array

# Fetch metrics from all accounts
all_metrics = []
for account_id in account_ids:
    metrics = fetch_ga4_metrics(account_id, access_token)
    all_metrics.append(metrics)

# Aggregate into one daily row
aggregated = aggregate_metrics(all_metrics)
write_metric_daily(workspace_id, provider, date, aggregated)
```

---

## E) Summary

### Current State
- ✅ **One Connection row per provider per workspace** (enforced by `@@unique([workspaceId, provider])`)
- ✅ **No code parses `authJson`** (write-only in connect/disconnect)
- ✅ **No UI assumes single account** (doesn't read `authJson`)

### Multiple Accounts Support
- ✅ **Safe to store multiple accounts in `authJson.selectedAccountIds`** (arrays)
- ✅ **No schema changes needed**
- ✅ **No breaking assumptions found**

### Required Changes
- ✅ **None** - Current codebase is compatible with multiple accounts in `authJson`

### Optional Improvements
1. FastAPI sync logic handles both single account (string) and multiple accounts (array)
2. Account selection UI allows multi-select
3. Sync aggregates metrics from all selected accounts

---

**Status:** ✅ **Multiple accounts via authJson is safe - no blocking changes needed**

