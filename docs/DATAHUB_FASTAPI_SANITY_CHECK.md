# Data Hub FastAPI Implementation - Sanity Check

**Date:** 2024-12-19  
**Architecture:** Next.js (UI/Auth) + FastAPI (OAuth/Sync/Intel) + Supabase Postgres  
**Status:** Feasibility OK with minimal adjustments

---

## A) Feasibility: OK

**✅ Repo structure:**
- `services/agent-runtime/` exists → `services/intel/` follows same pattern
- `Connection.authJson` can store encrypted tokens (no schema change)
- `workspaceId` tenancy already enforced (NOT NULL, backfilled)
- Existing service key auth pattern (`X-AGENT-SERVICE-KEY`) reusable

**✅ OAuth flow:**
- FastAPI handles OAuth (start/callback) → stores tokens in DB
- Next.js redirects to FastAPI OAuth URL → receives redirect back
- No conflicts with existing NextAuth (separate flow)

**✅ Sync architecture:**
- Render Cron → FastAPI `/internal/cron/sync-daily` (CRON_SECRET auth)
- FastAPI reads `Connection` → fetches provider APIs → writes `MetricDaily`
- Direct Postgres access via Prisma (FastAPI uses asyncpg or Prisma Python client)

**⚠️ Minor adjustments needed:**
- Add `GOOGLE_ANALYTICS` to provider enum (currently only `GOOGLE_ADS`)
- Update `ChannelCard.tsx` to redirect to FastAPI OAuth (not Next.js route)
- FastAPI needs DB connection (same `DATABASE_URL` as Next.js)

---

## B) Minimal Changes Required

**Files to create:**
- `services/intel/app/main.py` - FastAPI app
- `services/intel/app/routers/oauth_ga4.py` - OAuth routes
- `services/intel/app/routers/providers.py` - Account selection
- `services/intel/app/routers/internal.py` - Cron sync endpoint
- `services/intel/app/routers/intel.py` - Chat analysis
- `services/intel/app/db.py` - Prisma/asyncpg connection
- `services/intel/app/crypto.py` - Token encryption (AES-256-GCM)
- `services/intel/requirements.txt` - Dependencies
- `lib/intel-client.ts` - Next.js wrapper for intel calls

**Files to modify:**
- `components/ChannelCard.tsx` (line 139-167) - Redirect to FastAPI OAuth
- `app/api/chat/route.ts` (line 170-194) - Add intel call before OpenAI
- `prisma/schema.prisma` (line 108) - Add `GOOGLE_ANALYTICS` to provider enum comment
- `app/api/data/connect/route.ts` (line 6) - Add `GOOGLE_ANALYTICS` to VALID_PROVIDERS
- `app/api/data/disconnect/route.ts` (line 6) - Add `GOOGLE_ANALYTICS` to VALID_PROVIDERS
- `app/api/data/overview/route.ts` (line 8) - Add `GOOGLE_ANALYTICS` to PROVIDERS
- `app/api/data/channel/route.ts` (line 8) - Add `GOOGLE_ANALYTICS` to VALID_PROVIDERS
- `app/(app)/data/page.tsx` (line 8) - Add `GOOGLE_ANALYTICS` to PROVIDERS
- `app/(app)/data/[provider]/page.tsx` (line 8) - Add `GOOGLE_ANALYTICS` to VALID_PROVIDERS
- `components/ChannelCard.tsx` (line 38-48) - Add `GOOGLE_ANALYTICS` to display name mapping

**Files to inspect (for conflicts):**
- `app/(app)/data/[provider]/page.tsx` - Verify provider slug mapping handles `GOOGLE_ANALYTICS`
- `components/ChannelDetailContent.tsx` - Verify provider display names

---

## C) DB Changes (if any)

**Decision: We can do it without new tables.**

**Rationale:**
- `Connection.authJson` stores tokens (encrypted)
- `Connection.status` tracks sync state (`CONNECTED`, `PENDING`, `ERROR`)
- `Connection.updatedAt` tracks last sync time
- `MetricDaily` stores daily metrics (existing table)

**Optional (only if needed for cron locking):**
If you want explicit job locks to prevent double-runs:

```prisma
model SyncLock {
  id          String   @id @default(cuid())
  provider    String   // GOOGLE_ANALYTICS | META_ADS | ...
  workspaceId String
  lockedAt    DateTime @default(now())
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@unique([provider, workspaceId])
  @@index([workspaceId])
  @@index([expiresAt])
}

// Add to Workspace model:
syncLocks SyncLock[]
```

**Recommendation:** Use `pg_advisory_lock` instead (no table needed). See section G.

---

## D) FastAPI Endpoints

**OAuth (GA4):**
- `GET /oauth/ga4/start?workspaceId=...&userId=...` - Returns OAuth URL, stores state
- `GET /oauth/ga4/callback?code=...&state=...` - Exchanges code, stores tokens, redirects to Next.js
- `GET /providers/ga4/accounts?workspaceId=...` - Lists GA4 properties (requires auth header)
- `POST /providers/ga4/select-account` - Stores selected property ID in Connection.authJson

**Internal (Cron):**
- `POST /internal/cron/sync-daily` - Triggered by Render Cron, syncs all providers
  - Auth: `X-Cron-Secret` header (matches `CRON_SECRET`)
  - Body: `{ provider?: string }` (optional, syncs all if omitted)

**Intel (Chat):**
- `GET /health` - Health check
- `POST /analyze/chat` - Analyzes chat context, returns facts/actions
  - Auth: `X-Intel-API-Key` header (matches `INTEL_API_KEY`)

**All endpoints require tenant object:**
```python
class Tenant(BaseModel):
    userId: str
    workspaceId: str
```

---

## E) Next.js UI/Route Changes

**Modify `components/ChannelCard.tsx`:**
- Line 139-167: `handleConnect` redirects to FastAPI OAuth URL
  ```typescript
  if (summary.provider === "GOOGLE_ANALYTICS") {
    const intelUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
    window.location.href = `${intelUrl}/oauth/ga4/start?workspaceId=${workspaceId}&userId=${userId}`;
    return;
  }
  ```

**New component (optional):**
- `components/AccountSelectionModal.tsx` - Shows accounts from FastAPI, calls select-account

**Modify `app/api/chat/route.ts`:**
- Line 170: Before OpenAI call, add intel analysis
  ```typescript
  import { callIntel } from "@/lib/intel-client";
  
  // After line 168 (before OpenAI enrichment)
  let intelAnalysis = null;
  if (process.env.DATAHUB_INTEL_ENABLED === "true") {
    intelAnalysis = await callIntel({
      tenant: { userId: user.id, workspaceId: workspace.id },
      projectId: null,
      scope,
      message,
      context: { kpis: allKpis, insights: allInsights },
    });
  }
  
  // Modify system prompt (line 177) to include intelAnalysis if available
  ```

**No new Next.js routes needed** (FastAPI handles OAuth).

---

## F) Env Vars

**FastAPI (Render):**
```bash
DATABASE_URL=postgresql://...  # Same as Next.js
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://bureau-ai-intel.onrender.com/oauth/ga4/callback
CRON_SECRET=<generate-with-openssl-rand-base64-32>
INTEL_API_KEY=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>  # For token encryption
NEXTJS_BASE_URL=https://bureau-ai-nextjs.onrender.com  # For OAuth redirect back
PORT=10000  # Render sets automatically
```

**Next.js (Render):**
```bash
# Add new:
NEXT_PUBLIC_INTEL_BASE_URL=https://bureau-ai-intel.onrender.com
DATAHUB_INTEL_ENABLED=true
INTEL_API_KEY=<same-as-fastapi>
```

**Local dev (FastAPI):**
```bash
DATABASE_URL=postgresql://...  # Local Supabase
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/ga4/callback
CRON_SECRET=dev-secret
INTEL_API_KEY=dev-key
ENCRYPTION_KEY=<32-byte-base64>
NEXTJS_BASE_URL=http://localhost:3000
PORT=8001
```

**Local dev (Next.js):**
```bash
NEXT_PUBLIC_INTEL_BASE_URL=http://localhost:8001
DATAHUB_INTEL_ENABLED=true
INTEL_API_KEY=dev-key
```

---

## G) Locking + Cron

**Recommendation: Use `pg_advisory_lock` (no table needed).**

**FastAPI cron endpoint:**
```python
from asyncpg import create_pool
import asyncio

async def sync_daily():
    pool = await create_pool(DATABASE_URL)
    
    async with pool.acquire() as conn:
        # Try to acquire lock (lock_id = hash of "sync_daily")
        lock_id = 1234567890  # Fixed integer for this job
        
        # Try lock (non-blocking, expires after 1 hour)
        acquired = await conn.fetchval(
            "SELECT pg_try_advisory_lock($1)", lock_id
        )
        
        if not acquired:
            return {"status": "skipped", "reason": "already_running"}
        
        try:
            # Sync all providers
            connections = await conn.fetch(
                "SELECT * FROM \"Connection\" WHERE status = 'CONNECTED'"
            )
            
            for conn_row in connections:
                await sync_provider(conn_row)
            
            return {"status": "success"}
        finally:
            # Release lock
            await conn.execute("SELECT pg_advisory_unlock($1)", lock_id)
```

**Render Cron config:**
- Schedule: Daily at 2 AM UTC
- URL: `https://bureau-ai-intel.onrender.com/internal/cron/sync-daily`
- Method: POST
- Headers: `X-Cron-Secret: <CRON_SECRET>`

**Alternative (if advisory locks don't work):**
Use `SyncLock` table (see section C) with `lockedAt` and `expiresAt`. Check/acquire in transaction.

---

## H) Data Mapping per Provider

### GA4 (Phase 1)

**Daily metrics to pull:**
- `sessions`, `users`, `pageviews`, `bounceRate`, `avgSessionDuration`
- `conversions`, `conversionRate`, `revenue` (if e-commerce)

**Store in `MetricDaily.metricsJson`:**
```json
{
  "sessions": 1000,
  "users": 800,
  "pageviews": 2500,
  "bounceRate": 0.45,
  "avgSessionDuration": 120,
  "conversions": 25,
  "conversionRate": 0.025,
  "revenue": 500.00
}
```

**Store in `MetricDaily.dimensionsJson`:**
```json
{
  "propertyId": "123456789",
  "propertyName": "My Website"
}
```

**Rationale:** Fits existing `MetricDaily` structure. No new table needed.

---

### Meta Ads (Phase 2)

**Daily metrics:**
- `impressions`, `clicks`, `spend`, `ctr`, `cpc`, `conversions`, `conversionRate`

**Store in `MetricDaily.metricsJson`:**
```json
{
  "impressions": 50000,
  "clicks": 500,
  "spend": 250.00,
  "ctr": 0.01,
  "cpc": 0.50,
  "conversions": 10,
  "conversionRate": 0.02
}
```

**Store in `MetricDaily.dimensionsJson`:**
```json
{
  "adAccountId": "act_123456",
  "campaignId": "123456789",
  "campaignName": "Summer Sale"
}
```

**Rationale:** Same structure as GA4. Reuse `MetricDaily`.

---

### Email Marketing (Phase 3)

**Recommendation: Mailchimp first** (most common, good API).

**Daily metrics:**
- `emailsSent`, `opens`, `clicks`, `bounces`, `unsubscribes`, `openRate`, `clickRate`

**Store in `MetricDaily.metricsJson`:**
```json
{
  "emailsSent": 10000,
  "opens": 2000,
  "clicks": 500,
  "bounces": 50,
  "unsubscribes": 10,
  "openRate": 0.20,
  "clickRate": 0.05
}
```

**Store in `MetricDaily.dimensionsJson`:**
```json
{
  "listId": "abc123",
  "campaignId": "camp_456"
}
```

**Rationale:** Reuse `MetricDaily`. Email metrics are time-series like ads/analytics.

---

### LinkedIn Organic Posts (Phase 4)

**Decision: Store in `MetricDaily` with `dimensionsJson` for post-level data.**

**Daily metrics (aggregated per workspace):**
- `postsPublished`, `impressions`, `clicks`, `likes`, `comments`, `shares`, `engagementRate`

**Store in `MetricDaily.metricsJson`:**
```json
{
  "postsPublished": 5,
  "impressions": 10000,
  "clicks": 200,
  "likes": 150,
  "comments": 20,
  "shares": 10,
  "engagementRate": 0.018
}
```

**Store in `MetricDaily.dimensionsJson`:**
```json
{
  "postIds": ["urn:li:activity:123", "urn:li:activity:456"],
  "accountId": "123456"
}
```

**Rationale:** Daily aggregation is sufficient for Data Hub overview. If you need post-level detail later, add `SocialPostDaily` table. For MVP, `MetricDaily` is enough.

---

## I) Test Plan

### Local Dev Steps

1. **Start FastAPI:**
   ```bash
   cd services/intel
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```

2. **Start Next.js:**
   ```bash
   npm run dev
   ```

3. **Verify health:**
   ```bash
   curl http://localhost:8001/health
   # Expected: {"status":"ok","service":"intel","version":"0.1.0"}
   ```

4. **Test OAuth flow:**
   - Navigate to `/data`
   - Click "Verbinden" on Google Analytics card
   - Should redirect to FastAPI OAuth URL
   - Complete OAuth → redirects back to Next.js
   - Verify `Connection` row has encrypted `authJson`

5. **Test account selection:**
   - After OAuth, FastAPI should show account selection
   - Select property → verify `Connection.authJson.selectedAccountIds` updated

6. **Test sync (manual):**
   ```bash
   curl -X POST http://localhost:8001/internal/cron/sync-daily \
     -H "X-Cron-Secret: dev-secret" \
     -H "Content-Type: application/json"
   # Expected: {"status":"success"}
   ```

7. **Verify metrics:**
   ```sql
   SELECT * FROM "MetricDaily" 
   WHERE "workspaceId" = '<your-workspace-id>' 
   AND provider = 'GOOGLE_ANALYTICS'
   ORDER BY date DESC;
   ```

---

### Smoke Tests in UI

1. **Data Hub overview:**
   - Navigate to `/data`
   - Verify Google Analytics card shows "Verbonden"
   - Verify metrics display (if sync ran)

2. **Provider detail:**
   - Click Google Analytics card
   - Navigate to `/data/google_analytics`
   - Verify metrics chart visible
   - Verify insights list visible

3. **Chat:**
   - Use Master Chat on `/data`
   - Send: "Show me my analytics data"
   - Verify reply includes metrics (and intel analysis if enabled)

4. **Disconnect:**
   - Click "Loskoppelen" on Google Analytics card
   - Verify status updates to "Niet verbonden"
   - Verify `Connection.status` = "NOT_CONNECTED" in DB

---

### DB Verification Queries

```sql
-- Check connections
SELECT provider, status, "updatedAt" 
FROM "Connection" 
WHERE "workspaceId" = '<workspace-id>'
ORDER BY "updatedAt" DESC;

-- Check encrypted tokens (should be encrypted string, not plain JSON)
SELECT provider, 
       CASE WHEN "authJson" IS NULL THEN 'NULL' 
            WHEN "authJson" LIKE '{%' THEN 'PLAINTEXT (BAD!)' 
            ELSE 'ENCRYPTED (OK)' END as token_status
FROM "Connection"
WHERE "workspaceId" = '<workspace-id>';

-- Check metrics
SELECT provider, date, "metricsJson"
FROM "MetricDaily"
WHERE "workspaceId" = '<workspace-id>'
ORDER BY date DESC
LIMIT 10;

-- Check for duplicate metrics (should be 0)
SELECT "workspaceId", provider, date, COUNT(*) as count
FROM "MetricDaily"
GROUP BY "workspaceId", provider, date
HAVING COUNT(*) > 1;
```

---

### Rollback Plan

**If OAuth fails:**
1. Set `Connection.status` = "NOT_CONNECTED"
2. Clear `Connection.authJson` = NULL
3. User can re-connect

**If sync fails:**
1. Check FastAPI logs for errors
2. Verify `Connection.authJson` has valid tokens
3. Manually trigger sync: `POST /internal/cron/sync-daily`
4. If tokens expired: User re-connects OAuth

**If intel fails:**
1. Set `DATAHUB_INTEL_ENABLED=false` in Next.js env
2. Chat falls back to deterministic reply (existing behavior)
3. No data loss

**Code rollback:**
```bash
git revert <commit-hash>
# Redeploy both services
```

---

## J) Conflicts Identified

**✅ No blocking conflicts found.**

**Minor adjustments:**
1. `GOOGLE_ANALYTICS` not in provider enum → Add to `VALID_PROVIDERS` in 6 files (connect, disconnect, overview, channel, data page, provider page)
2. `ChannelCard.tsx` currently calls Next.js `/api/data/connect` → Change to redirect to FastAPI
3. Provider slug mapping works (`slugToProvider` converts `google_analytics` → `GOOGLE_ANALYTICS`) → No change needed
4. Display name mapping → Add `GOOGLE_ANALYTICS: "Google Analytics"` to `getProviderDisplayName` in `ChannelCard.tsx`

**Tenancy:**
- ✅ All Data Hub models use `workspaceId` (NOT NULL)
- ✅ `getOrCreateWorkspace()` already used everywhere
- ✅ No userId/workspaceId mismatch

**Constraints:**
- ✅ `@@unique([workspaceId, provider])` allows one connection per provider per workspace
- ✅ Multiple accounts per provider stored in `authJson.selectedAccountIds` (no constraint violation)

---

## K) Files to Inspect (if needed)

**If provider slug mapping fails:**
- `app/(app)/data/[provider]/page.tsx` - Check `slugToProvider` function
- `components/ChannelDetailContent.tsx` - Check provider display names

**If OAuth redirect breaks:**
- `middleware.ts` - Verify OAuth callback routes are not blocked
- `app/api/auth/[...nextauth]/route.ts` - Verify no conflict with NextAuth

---

**Status:** ✅ **Feasibility OK - Ready for implementation**

