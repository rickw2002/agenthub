# Data Hub OAuth Implementation Plan - Codebase Review

**Date:** 2024-12-19  
**Reviewer:** Cursor (codebase audit)  
**Plan:** `docs/DATAHUB_OAUTH_IMPLEMENTATION_PLAN.md`

---

## A) Confirmed OK Assumptions

✅ **Schema & Tenancy:**
- `Connection.authJson` is `String?` - can store encrypted tokens (no schema change needed)
- `workspaceId` is NOT NULL and enforced (already backfilled)
- `@@unique([workspaceId, provider])` constraint exists (line 119 in schema.prisma)
- `getOrCreateWorkspace(userId)` helper exists and is used in all Data Hub routes

✅ **Auth Patterns:**
- `requireAuth()` and `getCurrentUser()` helpers exist (`lib/auth-helpers.ts`)
- Service key auth pattern exists (`X-AGENT-SERVICE-KEY` in `app/api/internal/run-context/route.ts`)
- NextAuth is separate from OAuth flow (no conflicts)

✅ **UI Components:**
- `components/ChannelCard.tsx` exists (line 139-167 has `handleConnect`)
- `components/ChannelDetailContent.tsx` exists
- Provider display name mapping exists (`getProviderDisplayName`)

✅ **Data Models:**
- `MetricDaily` table exists with `workspaceId` (NOT NULL)
- `Connection` table exists with `workspaceId` (NOT NULL)
- No new tables needed for MVP

---

## B) Risks / Mismatches

### 🔴 **CRITICAL: Plan mentions n8n, but requirement is NO n8n**

**Mismatch:**
- Plan section D (lines 450-627) describes n8n webhook architecture
- Plan mentions `N8N_DATAHUB_SYNC_WEBHOOK_URL`, `N8N_RUN_WEBHOOK_URL`
- Plan describes n8n workflow steps (lines 602-606)
- Plan checklist item #15: "Create n8n workflow stub"

**Actual requirement (from `DATAHUB_FASTAPI_SANITY_CHECK.md`):**
- **NO n8n, NO external workflow tools**
- FastAPI talks directly to Postgres
- Render Cron Job calls FastAPI internal endpoints directly

**Impact:** Sections D1-D4 of the plan are **invalid** and must be replaced.

---

### 🔴 **CRITICAL: OAuth routes location mismatch**

**Plan assumption:**
- OAuth routes in Next.js (`app/api/oauth/google/start/route.ts`, `app/api/oauth/google/callback/route.ts`)
- Next.js handles OAuth flow

**Actual requirement (from `DATAHUB_FASTAPI_SANITY_CHECK.md`):**
- FastAPI handles OAuth (start/callback)
- Next.js redirects to FastAPI OAuth URL
- FastAPI redirects back to Next.js after OAuth

**Impact:** Sections C1-C2 of the plan are **partially invalid**:
- ❌ Do NOT create `app/api/oauth/google/start/route.ts`
- ❌ Do NOT create `app/api/oauth/google/callback/route.ts`
- ✅ Create FastAPI routes: `/oauth/ga4/start`, `/oauth/ga4/callback`
- ✅ Modify `components/ChannelCard.tsx` to redirect to FastAPI URL

---

### 🟡 **MEDIUM: Sync architecture mismatch**

**Plan assumption:**
- Next.js `/api/data/sync` route calls n8n webhook
- n8n fetches tokens from `/api/internal/connection-tokens`
- n8n writes metrics via `/api/internal/metrics/write`

**Actual requirement:**
- Render Cron → FastAPI `/internal/cron/sync-daily` (direct call)
- FastAPI reads `Connection` directly from DB
- FastAPI writes `MetricDaily` directly to DB
- No Next.js sync route needed (or minimal trigger route)

**Impact:** 
- ❌ Do NOT create `app/api/data/sync/route.ts` (or make it minimal trigger)
- ❌ Do NOT create `app/api/internal/connection-tokens/route.ts` (FastAPI reads DB directly)
- ❌ Do NOT create `app/api/internal/metrics/write/route.ts` (FastAPI writes DB directly)
- ✅ Create FastAPI `/internal/cron/sync-daily` endpoint

---

### 🟡 **MEDIUM: Account selection route location**

**Plan assumption:**
- Next.js route: `app/api/data/select-account/route.ts`
- Next.js route: `app/api/oauth/google/accounts/route.ts`

**Actual requirement:**
- FastAPI route: `/providers/ga4/accounts` (list accounts)
- FastAPI route: `/providers/ga4/select-account` (store selection)

**Impact:**
- ❌ Do NOT create `app/api/data/select-account/route.ts`
- ❌ Do NOT create `app/api/oauth/google/accounts/route.ts`
- ✅ Create FastAPI routes for account selection

---

### 🟢 **LOW: Intel service structure**

**Plan assumption:**
- FastAPI service in `services/intel/`
- Endpoints: `/health`, `/analyze/chat`

**Actual requirement:**
- ✅ Matches plan (FastAPI in `services/intel/`)
- ✅ Endpoints match plan

**Impact:** Section E is **valid** (no changes needed).

---

### 🟢 **LOW: Intel client wrapper**

**Plan assumption:**
- `lib/intel-client.ts` with `callIntel()` function
- Kill switch: `DATAHUB_INTEL_ENABLED`

**Actual requirement:**
- ✅ Matches plan

**Impact:** Section F1 is **valid** (no changes needed).

---

### 🟢 **LOW: Chat route integration**

**Plan assumption:**
- Modify `app/api/chat/route.ts` to call intel before OpenAI
- Include intel output in OpenAI prompt

**Actual requirement:**
- ✅ Matches plan

**Impact:** Section F2 is **valid** (no changes needed).

---

## C) Missing Edits (file path + what to change)

### C1. Provider enum additions (already identified, but confirm all files)

**Files to modify:**
1. `app/api/data/connect/route.ts` (line 6) - Add `GOOGLE_ANALYTICS` to `VALID_PROVIDERS`
2. `app/api/data/disconnect/route.ts` (line 6) - Add `GOOGLE_ANALYTICS` to `VALID_PROVIDERS`
3. `app/api/data/overview/route.ts` (line 8) - Add `GOOGLE_ANALYTICS` to `PROVIDERS`
4. `app/api/data/channel/route.ts` (line 8) - Add `GOOGLE_ANALYTICS` to `VALID_PROVIDERS`
5. `app/(app)/data/page.tsx` (line 8) - Add `GOOGLE_ANALYTICS` to `PROVIDERS`
6. `app/(app)/data/[provider]/page.tsx` (line 8) - Add `GOOGLE_ANALYTICS` to `VALID_PROVIDERS`
7. `app/api/chat/route.ts` (line 7-15) - Add `"GOOGLE_ANALYTICS"` to `VALID_SCOPES`
8. `components/ChannelCard.tsx` (line 40) - Add `GOOGLE_ANALYTICS: "Google Analytics"` to `getProviderDisplayName`
9. `components/ChannelDetailContent.tsx` (line 49) - Add `GOOGLE_ANALYTICS: "Google Analytics"` to `getProviderDisplayName`
10. `prisma/schema.prisma` (line 108) - Add `GOOGLE_ANALYTICS` to provider enum comment

**Status:** ✅ Already identified in plan and sanity check.

---

### C2. ChannelCard.tsx OAuth redirect (CRITICAL - plan has wrong location)

**File:** `components/ChannelCard.tsx` (line 139-167)

**Current code:**
```typescript
const handleConnect = async (e: React.MouseEvent) => {
  // ... calls /api/data/connect
};
```

**Required change:**
```typescript
const handleConnect = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  // OAuth-enabled providers redirect to FastAPI
  if (process.env.NEXT_PUBLIC_DATAHUB_OAUTH_ENABLED === "true" && 
      (summary.provider === "GOOGLE_ANALYTICS" || summary.provider === "GOOGLE_ADS")) {
    const intelUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
    if (!intelUrl) {
      setError("OAuth not configured");
      return;
    }
    // Redirect to FastAPI OAuth start
    window.location.href = `${intelUrl}/oauth/ga4/start?workspaceId=${workspaceId}&userId=${userId}`;
    return;
  }
  
  // Fallback to mock connect (existing behavior)
  // ... existing code ...
};
```

**Missing:** 
- Need to get `workspaceId` and `userId` in client component (via props or API call)
- Need to add `NEXT_PUBLIC_INTEL_BASE_URL` env var

---

### C3. FastAPI OAuth routes (NOT in plan - must add)

**Files to CREATE (not in plan):**
1. `services/intel/app/routers/oauth_ga4.py` - OAuth start/callback routes
2. `services/intel/app/routers/providers.py` - Account list/selection routes
3. `services/intel/app/routers/internal.py` - Cron sync endpoint
4. `services/intel/app/db.py` - Database connection (asyncpg or Prisma Python)
5. `services/intel/app/crypto.py` - Token encryption (AES-256-GCM)

**Plan incorrectly lists these as Next.js routes:**
- ❌ `app/api/oauth/google/start/route.ts` (WRONG - should be FastAPI)
- ❌ `app/api/oauth/google/callback/route.ts` (WRONG - should be FastAPI)
- ❌ `app/api/oauth/google/accounts/route.ts` (WRONG - should be FastAPI)
- ❌ `app/api/data/select-account/route.ts` (WRONG - should be FastAPI)

---

### C4. FastAPI sync endpoint (NOT in plan - must add)

**File to CREATE:**
- `services/intel/app/routers/internal.py` - Add `/internal/cron/sync-daily` endpoint

**Plan incorrectly describes:**
- ❌ `app/api/data/sync/route.ts` (WRONG - FastAPI handles sync, not Next.js)
- ❌ `app/api/internal/connection-tokens/route.ts` (WRONG - FastAPI reads DB directly)
- ❌ `app/api/internal/metrics/write/route.ts` (WRONG - FastAPI writes DB directly)

---

### C5. OAuth state management (missing in plan)

**File to CREATE:**
- `services/intel/app/oauth_state.py` - Store/verify OAuth state (DB or Redis)

**Plan mentions:**
- `lib/oauth-state.ts` (Next.js) - This is WRONG if FastAPI handles OAuth

**Required:** OAuth state must be managed in FastAPI (where OAuth happens).

---

### C6. Google OAuth helper (missing in plan)

**File to CREATE:**
- `services/intel/app/google_oauth.py` - Google OAuth URL builder, token exchange

**Plan mentions:**
- `lib/google-oauth.ts` (Next.js) - This is WRONG if FastAPI handles OAuth

**Required:** Google OAuth logic must be in FastAPI.

---

### C7. Crypto helper location (plan has wrong location)

**Plan lists:**
- `lib/crypto.ts` (Next.js)

**Actual requirement:**
- ✅ FastAPI needs crypto: `services/intel/app/crypto.py`
- ❓ Next.js may also need crypto if it ever reads tokens (unlikely in MVP)

**Recommendation:** Create crypto in FastAPI first. Add to Next.js only if needed later.

---

## D) Minimal Ordered Task List (10-25 items max)

### Phase 1: Foundation (OAuth + Crypto)

1. ✅ **Add `GOOGLE_ANALYTICS` to provider enums** (10 files - see C1)
   - Files: `app/api/data/connect/route.ts`, `app/api/data/disconnect/route.ts`, `app/api/data/overview/route.ts`, `app/api/data/channel/route.ts`, `app/(app)/data/page.tsx`, `app/(app)/data/[provider]/page.tsx`, `app/api/chat/route.ts`, `components/ChannelCard.tsx`, `components/ChannelDetailContent.tsx`, `prisma/schema.prisma`

2. ✅ **Create FastAPI crypto module** (`services/intel/app/crypto.py`)
   - AES-256-GCM encryption/decryption
   - Functions: `encrypt_token()`, `decrypt_token()`, `encrypt_auth_json()`, `decrypt_auth_json()`
   - Env var: `ENCRYPTION_KEY` (32-byte base64)

3. ✅ **Create FastAPI DB connection** (`services/intel/app/db.py`)
   - Use asyncpg or Prisma Python client
   - Connect to same `DATABASE_URL` as Next.js
   - Helper functions: `get_connection()`, `get_workspace()`, `upsert_connection()`

4. ✅ **Create FastAPI OAuth state manager** (`services/intel/app/oauth_state.py`)
   - Store state in DB (new table or reuse existing)
   - Functions: `generate_state()`, `store_state()`, `verify_state()`
   - State includes: `workspaceId`, `provider`, `expiresAt`

5. ✅ **Create FastAPI Google OAuth helper** (`services/intel/app/google_oauth.py`)
   - Build OAuth URL: `build_google_auth_url()`
   - Exchange code for tokens: `exchange_google_code()`
   - Fetch user info: `fetch_google_user_info()`
   - Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

---

### Phase 2: OAuth Routes (FastAPI)

6. ✅ **Create FastAPI OAuth start route** (`services/intel/app/routers/oauth_ga4.py`)
   - `GET /oauth/ga4/start?workspaceId=...&userId=...`
   - Generate state, build OAuth URL
   - Redirect to Google

7. ✅ **Create FastAPI OAuth callback route** (`services/intel/app/routers/oauth_ga4.py`)
   - `GET /oauth/ga4/callback?code=...&state=...`
   - Verify state, exchange code
   - Encrypt tokens, store in `Connection.authJson`
   - Redirect to Next.js: `${NEXTJS_BASE_URL}/data?connected=google_analytics`

8. ✅ **Create FastAPI accounts list route** (`services/intel/app/routers/providers.py`)
   - `GET /providers/ga4/accounts?workspaceId=...`
   - Auth: Require `workspaceId` in query (or session)
   - Decrypt tokens, call Google API
   - Return list of GA4 properties

9. ✅ **Create FastAPI account selection route** (`services/intel/app/routers/providers.py`)
   - `POST /providers/ga4/select-account`
   - Body: `{ workspaceId, accountId }`
   - Update `Connection.authJson.selectedAccountIds.googleAnalytics`
   - Re-encrypt and save

---

### Phase 3: UI Integration (Next.js)

10. ✅ **Modify ChannelCard.tsx** (`components/ChannelCard.tsx` line 139-167)
    - Add OAuth redirect logic (see C2)
    - Get `workspaceId` and `userId` (via props or API call)
    - Check `NEXT_PUBLIC_DATAHUB_OAUTH_ENABLED` flag
    - Redirect to FastAPI OAuth URL

11. ✅ **Create AccountSelectionModal component** (`components/AccountSelectionModal.tsx`)
    - Fetch accounts from FastAPI: `GET /providers/ga4/accounts`
    - Show list, allow selection
    - Call FastAPI: `POST /providers/ga4/select-account`
    - Trigger sync after selection

12. ✅ **Add OAuth callback handler** (`app/(app)/data/page.tsx`)
    - Check URL param: `?connected=google_analytics`
    - Show account selection modal if accounts not selected
    - Show success message

---

### Phase 4: Sync (FastAPI + Render Cron)

13. ✅ **Create FastAPI sync endpoint** (`services/intel/app/routers/internal.py`)
    - `POST /internal/cron/sync-daily`
    - Auth: `X-Cron-Secret` header (matches `CRON_SECRET`)
    - Body: `{ provider?: string }` (optional, syncs all if omitted)
    - Use `pg_advisory_lock` to prevent concurrent runs
    - Read `Connection` rows (filter by `workspaceId`, `status="CONNECTED"`)
    - For each connection: 
      - Decrypt tokens
      - Fetch metrics from provider API (last 7-30 days)
      - Write to `MetricDaily` (upsert by `date + provider + workspaceId`)

14. ✅ **Configure Render Cron Job**
    - Schedule: Daily at 2 AM UTC
    - Command: `curl -X POST https://bureau-ai-intel.onrender.com/internal/cron/sync-daily -H "X-Cron-Secret: ${CRON_SECRET}"`
    - Or use Render Cron Job feature (if available)

15. ✅ **Add manual sync trigger (optional)** (`app/api/data/sync/route.ts`)
    - Minimal Next.js route that calls FastAPI sync endpoint
    - Auth: `requireAuth()`
    - Body: `{ provider?: string }`
    - Calls FastAPI: `POST /internal/cron/sync-daily` (with `X-Cron-Secret`)

---

### Phase 5: Intel Service (FastAPI)

16. ✅ **Create FastAPI intel service structure** (`services/intel/app/main.py`)
    - FastAPI app, CORS middleware
    - Include routers: `oauth_ga4`, `providers`, `internal`, `intel`

17. ✅ **Create FastAPI health endpoint** (`services/intel/app/routers/health.py`)
    - `GET /health`
    - Return: `{ status: "ok", service: "intel", version: "0.1.0" }`

18. ✅ **Create FastAPI intel analyze endpoint** (`services/intel/app/routers/intel.py`)
    - `POST /analyze/chat`
    - Auth: `X-Intel-API-Key` header
    - Body: `{ tenant, scope, message, context }`
    - Return: `{ facts, anomalies, actions, confidence, reasoning }`
    - Phase 1: Deterministic analysis (no LLM, no DB reads)

---

### Phase 6: Intel Integration (Next.js)

19. ✅ **Create intel client wrapper** (`lib/intel-client.ts`)
    - Functions: `isIntelEnabled()`, `callIntel()`
    - Kill switch: `DATAHUB_INTEL_ENABLED`
    - Timeout: 2s, safe error handling
    - Env vars: `INTEL_BASE_URL`, `INTEL_API_KEY`

20. ✅ **Modify chat route** (`app/api/chat/route.ts` line 170-194)
    - Import `callIntel` from `lib/intel-client`
    - After building context (before OpenAI call):
      - Call `callIntel()` if enabled
      - Include intel output in OpenAI system prompt
      - Fallback to deterministic reply if intel fails

---

### Phase 7: Deployment

21. ✅ **Deploy FastAPI to Render**
    - Create Python service: `bureau-ai-intel`
    - Root directory: `services/intel`
    - Build command: `pip install -r requirements.txt`
    - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
    - Env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CRON_SECRET`, `INTEL_API_KEY`, `ENCRYPTION_KEY`, `NEXTJS_BASE_URL`

22. ✅ **Update Next.js env vars**
    - Add: `NEXT_PUBLIC_INTEL_BASE_URL` (FastAPI URL)
    - Add: `DATAHUB_OAUTH_ENABLED=true`
    - Add: `DATAHUB_INTEL_ENABLED=true`
    - Add: `INTEL_API_KEY` (same as FastAPI)

23. ✅ **Test OAuth flow**
    - Connect Google Analytics account
    - Verify tokens stored (encrypted) in `Connection.authJson`
    - Verify account selection works
    - Verify redirect back to Next.js

24. ✅ **Test sync flow**
    - Trigger manual sync (or wait for cron)
    - Verify `MetricDaily` rows created
    - Verify Data Hub overview shows metrics

25. ✅ **Test intel integration**
    - Send chat message in Data Hub
    - Verify intel called (check logs)
    - Verify enhanced reply includes intel insights

---

## Summary

**Total tasks:** 25

**Critical mismatches fixed:**
- ✅ OAuth routes moved from Next.js to FastAPI
- ✅ Sync architecture changed from n8n webhook to FastAPI direct DB access
- ✅ Account selection routes moved from Next.js to FastAPI
- ✅ Crypto helper location corrected (FastAPI, not Next.js)

**Files to CREATE (not in original plan):**
- `services/intel/app/routers/oauth_ga4.py`
- `services/intel/app/routers/providers.py`
- `services/intel/app/routers/internal.py`
- `services/intel/app/db.py`
- `services/intel/app/crypto.py`
- `services/intel/app/oauth_state.py`
- `services/intel/app/google_oauth.py`

**Files to NOT CREATE (plan incorrectly lists):**
- ❌ `app/api/oauth/google/start/route.ts`
- ❌ `app/api/oauth/google/callback/route.ts`
- ❌ `app/api/oauth/google/accounts/route.ts`
- ❌ `app/api/data/select-account/route.ts`
- ❌ `app/api/data/sync/route.ts` (or make it minimal trigger)
- ❌ `app/api/internal/connection-tokens/route.ts`
- ❌ `app/api/internal/metrics/write/route.ts`
- ❌ `lib/oauth-state.ts`
- ❌ `lib/google-oauth.ts`
- ❌ `lib/crypto.ts` (FastAPI handles crypto)

**Status:** ✅ Plan reviewed, mismatches identified, corrected task list provided.

