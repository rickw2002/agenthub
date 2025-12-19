# Data Hub OAuth + Ingest + Intel Implementation Plan

**Date:** 2024-12-19  
**Status:** Plan OK - Ready for implementation  
**Repo:** Bureau-AI (Next.js + Prisma + n8n + FastAPI)

---

## Executive Summary

**Plan Status:** ✅ **Plan OK**

This plan is grounded in the actual codebase:
- Uses existing `Connection.authJson` for token storage (no schema changes needed)
- Leverages existing `getOrCreateWorkspace()` for tenancy
- Follows existing n8n webhook pattern (`app/api/agents/run/route.ts`)
- Extends existing Data Hub UI (`components/ChannelCard.tsx`)
- Uses existing service key auth pattern (`X-AGENT-SERVICE-KEY`)

**MVP Scope:**
1. Google OAuth (GA4 + Google Ads) first
2. Token storage in `Connection.authJson` (encrypted)
3. n8n ingest workflow (writes to `MetricDaily`)
4. FastAPI intel service (optional, kill-switch enabled)
5. Enhanced Data Hub chat with intel integration

---

## A) Current-State Audit

### A1. Existing Data Hub Connect/Disconnect Routes

**File:** `app/api/data/connect/route.ts`
- **Current behavior:** Creates/updates `Connection` with `status="CONNECTED"` and basic `authJson: { connected: true, connectedAt: ... }`
- **Tenancy:** Uses `getOrCreateWorkspace(user.id)` → `workspaceId`
- **Unique constraint:** `workspaceId_provider` (line 60-63)
- **AuthJson storage:** `String?` field, currently stores minimal JSON

**File:** `app/api/data/disconnect/route.ts`
- **Current behavior:** Sets `status="NOT_CONNECTED"`, clears `authJson`
- **Same tenancy pattern**

**Modification needed:** Extend `authJson` to store OAuth tokens (encrypted) instead of just `{ connected: true }`.

---

### A2. Existing n8n Integration Points

**File:** `app/api/agents/run/route.ts` (lines 82-109)
- **Pattern:** Fire-and-forget POST to `process.env.N8N_RUN_WEBHOOK_URL`
- **Body:** `{ runId, userAgentId }`
- **Auth:** None (internal webhook)
- **Error handling:** Updates `RunLog` on failure

**File:** `app/api/runs/callback/route.ts`
- **Pattern:** Callback endpoint for n8n to update `RunLog`
- **Auth:** `X-AGENT-SERVICE-KEY` header (matches `process.env.AGENT_SERVICE_KEY`)
- **Body:** `{ runId, status, resultUrl, summary, error, metadata }`

**File:** `app/api/internal/run-context/route.ts`
- **Pattern:** Internal endpoint for external services to fetch context
- **Auth:** `X-AGENT-SERVICE-KEY` header
- **Returns:** `{ runId, userAgentId, agentTemplate, config }`

**New pattern for Data Hub ingest:**
- Create `/api/data/sync` that calls n8n webhook with tenant + provider context
- n8n writes directly to `MetricDaily` via Prisma (or calls Next.js internal endpoint)

---

### A3. Existing Auth/Tenancy Helpers

**File:** `lib/workspace.ts`
- **Function:** `getOrCreateWorkspace(userId: string)`
- **Returns:** `Workspace` object with `id`, `ownerId`, `organizationId`
- **Usage:** Already used in all Data Hub routes

**File:** `lib/auth-helpers.ts`
- **Functions:** `requireAuth()`, `getCurrentUser()`
- **Pattern:** Standard auth check for all API routes

**Tenancy pattern:**
```typescript
const user = await getCurrentUser();
const workspace = await getOrCreateWorkspace(user.id);
// Use workspace.id for all queries
```

---

## B) DB + Schema Design for OAuth

### B1. Prisma Schema Changes

**Decision:** ✅ **Reuse existing `Connection.authJson`** (no schema changes needed)

**Current schema:**
```prisma
model Connection {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String   // Required, NOT NULL
  provider    String
  status      String   // CONNECTED | PENDING | ERROR | NOT_CONNECTED
  authJson    String?  // JSON stored as string
  ...
}
```

**AuthJson structure (encrypted):**
```typescript
interface ConnectionAuthJson {
  // OAuth tokens (encrypted)
  access_token: string;        // Encrypted
  refresh_token: string;        // Encrypted
  expires_at: number;           // Unix timestamp
  token_type?: string;          // "Bearer"
  scopes?: string[];            // ["https://www.googleapis.com/auth/analytics.readonly", ...]
  
  // Provider account selection
  selectedAccountIds?: {
    googleAnalytics?: string;   // GA4 property ID
    googleAds?: string;         // Google Ads customer ID
    metaAds?: string;           // Meta ad account ID
    linkedin?: string;          // LinkedIn account ID
  };
  
  // Provider user info
  providerUserId?: string;      // Google user ID, Meta user ID, etc.
  providerEmail?: string;       // User's email from provider
  
  // Metadata
  connectedAt: string;          // ISO timestamp
  lastSyncAt?: string;          // ISO timestamp
  lastSyncError?: string;       // Error message if sync failed
}
```

**Encryption approach:**
- **New file:** `lib/crypto.ts`
- **Algorithm:** AES-256-GCM (Node.js `crypto` module)
- **Key:** `process.env.DATAHUB_ENCRYPTION_KEY` (32-byte base64)
- **Functions:**
  - `encryptToken(token: string): string`
  - `decryptToken(encrypted: string): string`
  - `encryptAuthJson(auth: ConnectionAuthJson): string`
  - `decryptAuthJson(encrypted: string): ConnectionAuthJson`

**Rationale:**
- No schema migration needed (reuse `authJson`)
- Encryption at application layer (tokens never stored in plaintext)
- Workspace tenancy already enforced (`workspaceId` required)

---

### B2. Indexes/Constraints

**Existing indexes (already sufficient):**
- `@@unique([workspaceId, provider])` - Prevents duplicate connections per workspace
- `@@index([workspaceId])` - Fast workspace queries
- `@@index([workspaceId, provider])` - Fast provider queries

**No new indexes needed.**

---

## C) Next.js OAuth Routes + UI

### C1. OAuth Routes

#### **File:** `app/api/oauth/google/start/route.ts`

**Purpose:** Initiate Google OAuth flow

**Request:** `GET /api/oauth/google/start?provider=GOOGLE_ADS|GOOGLE_ANALYTICS`

**Response:** `{ authUrl: string, state: string }`

**Implementation:**
```typescript
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { generateState, storeOAuthState } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  const user = await getCurrentUser();
  const workspace = await getOrCreateWorkspace(user.id);
  
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider"); // GOOGLE_ADS or GOOGLE_ANALYTICS
  
  // Generate OAuth state (CSRF protection)
  const state = generateState(workspace.id, provider);
  await storeOAuthState(state, workspace.id, provider);
  
  // Build Google OAuth URL
  const scopes = provider === "GOOGLE_ADS" 
    ? ["https://www.googleapis.com/auth/adwords"]
    : ["https://www.googleapis.com/auth/analytics.readonly"];
  
  const authUrl = buildGoogleAuthUrl({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/oauth/google/callback`,
    scopes,
    state,
  });
  
  return NextResponse.json({ authUrl, state });
}
```

**Dependencies:**
- `lib/oauth-state.ts` - State management (store in DB or session)
- `lib/google-oauth.ts` - Google OAuth URL builder

---

#### **File:** `app/api/oauth/google/callback/route.ts`

**Purpose:** Handle OAuth callback, exchange code for tokens

**Request:** `GET /api/oauth/google/callback?code=...&state=...`

**Response:** Redirect to `/data?connected=google_ads` or error

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  const user = await getCurrentUser();
  const workspace = await getOrCreateWorkspace(user.id);
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  // Verify state
  const stateData = await verifyOAuthState(state, workspace.id);
  if (!stateData) {
    return NextResponse.redirect("/data?error=invalid_state");
  }
  
  // Exchange code for tokens
  const tokens = await exchangeGoogleCode(code, stateData.provider);
  
  // Encrypt tokens
  const encryptedAuth = encryptAuthJson({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (tokens.expires_in * 1000),
    token_type: tokens.token_type,
    scopes: tokens.scope?.split(" ") || [],
    providerUserId: tokens.id_token?.sub, // Extract from JWT
    connectedAt: new Date().toISOString(),
  });
  
  // Update Connection
  await prisma.connection.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: stateData.provider,
      },
    },
    update: {
      status: "CONNECTED",
      authJson: encryptedAuth,
    },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      provider: stateData.provider,
      status: "CONNECTED",
      authJson: encryptedAuth,
    },
  });
  
  return NextResponse.redirect("/data?connected=" + stateData.provider.toLowerCase());
}
```

---

#### **File:** `app/api/oauth/google/accounts/route.ts`

**Purpose:** List available accounts/properties after OAuth

**Request:** `GET /api/oauth/google/accounts?provider=GOOGLE_ADS`

**Response:** `{ accounts: Array<{ id: string, name: string, type: string }> }`

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  const user = await getCurrentUser();
  const workspace = await getOrCreateWorkspace(user.id);
  
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  
  // Get connection with decrypted tokens
  const connection = await prisma.connection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider,
    },
  });
  
  if (!connection?.authJson) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }
  
  const auth = decryptAuthJson(connection.authJson);
  
  // Fetch accounts from Google API
  const accounts = provider === "GOOGLE_ADS"
    ? await fetchGoogleAdsAccounts(auth.access_token)
    : await fetchGoogleAnalyticsProperties(auth.access_token);
  
  return NextResponse.json({ accounts });
}
```

---

#### **File:** `app/api/data/select-account/route.ts`

**Purpose:** Persist selected account/property IDs

**Request:** `POST /api/data/select-account`  
**Body:** `{ provider: string, accountIds: { googleAnalytics?: string, googleAds?: string } }`

**Response:** `{ success: true }`

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  const user = await getCurrentUser();
  const workspace = await getOrCreateWorkspace(user.id);
  
  const { provider, accountIds } = await request.json();
  
  // Get existing connection
  const connection = await prisma.connection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider,
    },
  });
  
  if (!connection?.authJson) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }
  
  // Decrypt, update, re-encrypt
  const auth = decryptAuthJson(connection.authJson);
  auth.selectedAccountIds = {
    ...auth.selectedAccountIds,
    ...accountIds,
  };
  
  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      authJson: encryptAuthJson(auth),
    },
  });
  
  return NextResponse.json({ success: true });
}
```

---

### C2. UI Components

#### **File:** `components/ChannelCard.tsx` (modify existing)

**Current behavior (lines 139-167):**
- `handleConnect` calls `/api/data/connect` (sets status to CONNECTED)
- `handleDisconnect` calls `/api/data/disconnect` (sets status to NOT_CONNECTED)

**New behavior:**
- If `DATAHUB_OAUTH_ENABLED` env var is true:
  - `handleConnect` redirects to `/api/oauth/google/start?provider=...`
  - After OAuth, show account selection modal
  - After account selection, trigger sync
- If `DATAHUB_OAUTH_ENABLED` is false:
  - Keep existing behavior (mock connect)

**Modification:**
```typescript
// Add at top of component
const oauthEnabled = process.env.NEXT_PUBLIC_DATAHUB_OAUTH_ENABLED === "true";

const handleConnect = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (oauthEnabled && (summary.provider === "GOOGLE_ADS" || summary.provider === "GOOGLE_ANALYTICS")) {
    // Redirect to OAuth flow
    window.location.href = `/api/oauth/google/start?provider=${summary.provider}`;
    return;
  }
  
  // Existing mock connect logic
  // ...
};
```

**New component:** `components/AccountSelectionModal.tsx`
- Shows list of accounts from `/api/oauth/google/accounts`
- Allows user to select which account/property to use
- Calls `/api/data/select-account` on submit
- Triggers sync after selection

---

### C3. Provider Enums/Slugs

**Existing:** `app/api/data/connect/route.ts` line 6
```typescript
const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
```

**Add:** `GOOGLE_ANALYTICS` to enum
```typescript
const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;
```

**Provider mapping:**
- `GOOGLE_ADS` → Google Ads API
- `GOOGLE_ANALYTICS` → Google Analytics Data API (GA4)
- `META_ADS` → Meta Marketing API (future)
- `LINKEDIN` → LinkedIn Marketing API (future)

---

## D) Ingest Architecture with n8n

### D1. Next.js Sync Route

#### **File:** `app/api/data/sync/route.ts`

**Purpose:** Trigger data sync for a provider (calls n8n webhook)

**Request:** `POST /api/data/sync`  
**Body:** `{ provider?: string }` (if omitted, sync all connected providers)

**Response:** `{ success: true, syncId: string }`

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  const user = await getCurrentUser();
  const workspace = await getOrCreateWorkspace(user.id);
  
  // Check kill switch
  if (process.env.DATAHUB_INGEST_ENABLED !== "true") {
    return NextResponse.json({ error: "Data ingest is disabled" }, { status: 503 });
  }
  
  const { provider } = await request.json();
  
  // Get connections to sync
  const connections = provider
    ? await prisma.connection.findMany({
        where: {
          workspaceId: workspace.id,
          provider,
          status: "CONNECTED",
        },
      })
    : await prisma.connection.findMany({
        where: {
          workspaceId: workspace.id,
          status: "CONNECTED",
        },
      });
  
  // Call n8n webhook for each connection
  const webhookUrl = process.env.N8N_DATAHUB_SYNC_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Sync webhook not configured" }, { status: 500 });
  }
  
  const syncPromises = connections.map(async (connection) => {
    // Decrypt authJson to get tokens (n8n will need them)
    const auth = connection.authJson ? decryptAuthJson(connection.authJson) : null;
    
    if (!auth?.access_token) {
      return { connectionId: connection.id, error: "No tokens" };
    }
    
    // Call n8n webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant: {
          userId: user.id,
          workspaceId: workspace.id,
        },
        projectId: null,
        provider: connection.provider,
        connectionId: connection.id,
        selectedAccountIds: auth.selectedAccountIds,
        // DO NOT send tokens in webhook - n8n will fetch from internal endpoint
      }),
    });
    
    return { connectionId: connection.id, success: response.ok };
  });
  
  await Promise.all(syncPromises);
  
  return NextResponse.json({ success: true });
}
```

---

### D2. Internal Token Endpoint (for n8n)

#### **File:** `app/api/internal/connection-tokens/route.ts`

**Purpose:** Internal endpoint for n8n to fetch decrypted tokens (service-to-service)

**Request:** `GET /api/internal/connection-tokens?connectionId=...`  
**Headers:** `X-AGENT-SERVICE-KEY: ...`

**Response:** `{ access_token: string, refresh_token: string, expires_at: number, selectedAccountIds: {...} }`

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  // Service key auth (same pattern as run-context)
  const serviceKey = request.headers.get("X-AGENT-SERVICE-KEY");
  if (serviceKey !== process.env.AGENT_SERVICE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId! },
  });
  
  if (!connection?.authJson) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  
  // Decrypt and return tokens
  const auth = decryptAuthJson(connection.authJson);
  
  return NextResponse.json({
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    expires_at: auth.expires_at,
    selectedAccountIds: auth.selectedAccountIds,
  });
}
```

**Rationale:** Safer than sending tokens in webhook body. n8n fetches tokens only when needed, with service key auth.

---

### D3. n8n Workflow Contract

**Webhook input (from Next.js):**
```json
{
  "tenant": {
    "userId": "user_123",
    "workspaceId": "workspace_456"
  },
  "projectId": null,
  "provider": "GOOGLE_ADS",
  "connectionId": "conn_789",
  "selectedAccountIds": {
    "googleAds": "123-456-7890"
  }
}
```

**n8n workflow steps:**
1. Fetch tokens from `GET /api/internal/connection-tokens?connectionId=...` (with `X-AGENT-SERVICE-KEY`)
2. Call Google Ads API (or GA4 API) with tokens
3. Fetch last 7-30 days of metrics
4. Write to `MetricDaily` via Prisma (or call Next.js internal endpoint)

**n8n writes to MetricDaily:**
```typescript
// n8n HTTP Request node → POST /api/internal/metrics/write
// Body:
{
  "tenant": { "userId": "...", "workspaceId": "..." },
  "provider": "GOOGLE_ADS",
  "metrics": [
    {
      "date": "2024-12-19",
      "metricsJson": { "impressions": 1000, "clicks": 50, "conversions": 5, "spend": 100 },
      "dimensionsJson": { "campaign": "Campaign 1", "device": "mobile" }
    },
    // ... more days
  ]
}
```

**Alternative:** n8n writes directly to DB via Prisma (if n8n has DB access). Safer: use Next.js internal endpoint.

---

### D4. Internal Metrics Write Endpoint

#### **File:** `app/api/internal/metrics/write/route.ts`

**Purpose:** Internal endpoint for n8n to write metrics (service-to-service)

**Request:** `POST /api/internal/metrics/write`  
**Headers:** `X-AGENT-SERVICE-KEY: ...`  
**Body:** `{ tenant: {...}, provider: string, metrics: Array<{ date, metricsJson, dimensionsJson }> }`

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  // Service key auth
  const serviceKey = request.headers.get("X-AGENT-SERVICE-KEY");
  if (serviceKey !== process.env.AGENT_SERVICE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { tenant, provider, metrics } = await request.json();
  
  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: tenant.workspaceId },
  });
  
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  
  // Write metrics (upsert by date + provider + workspaceId)
  const metricsToCreate = metrics.map((m: any) => ({
    userId: tenant.userId,
    workspaceId: tenant.workspaceId,
    provider,
    date: new Date(m.date),
    metricsJson: JSON.stringify(m.metricsJson),
    dimensionsJson: m.dimensionsJson ? JSON.stringify(m.dimensionsJson) : null,
  }));
  
  // Use createMany with skipDuplicates (or upsert logic)
  await prisma.metricDaily.createMany({
    data: metricsToCreate,
    skipDuplicates: true, // Skip if date+provider+workspaceId already exists
  });
  
  return NextResponse.json({ success: true, written: metricsToCreate.length });
}
```

---

## E) Intel FastAPI Service

### E1. Folder Structure

```
services/
  intel/
    app/
      main.py              # FastAPI app
      routers/
        health.py          # GET /health
        analyze.py         # POST /analyze/chat
      models.py            # Pydantic models
    requirements.txt       # fastapi, uvicorn, pydantic, httpx
    README.md              # Setup instructions
    .env.example           # INTEL_API_KEY, PORT, etc.
```

---

### E2. Endpoints

#### **File:** `services/intel/app/routers/health.py`

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "service": "intel", "version": "0.1.0"}
```

#### **File:** `services/intel/app/routers/analyze.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

# Auth dependency
async def verify_api_key(x_intel_api_key: str = Header(..., alias="X-Intel-API-Key")):
    expected_key = os.getenv("INTEL_API_KEY")
    if not expected_key or x_intel_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# Request/Response models
class Tenant(BaseModel):
    userId: str
    workspaceId: str

class ChatAnalyzeRequest(BaseModel):
    tenant: Tenant
    projectId: Optional[str] = None
    scope: str  # "MASTER" | "GOOGLE_ADS" | ...
    message: str
    context: Dict[str, Any]  # Metrics, insights, etc.

class Fact(BaseModel):
    type: str  # "kpi_change", "anomaly", "trend"
    description: str
    value: Optional[float] = None
    period: str  # "7d", "30d"

class Action(BaseModel):
    priority: str  # "high", "medium", "low"
    description: str
    reasoning: str

class ChatAnalyzeResponse(BaseModel):
    facts: List[Fact]
    anomalies: List[Fact]
    actions: List[Action]
    confidence: float  # 0.0 - 1.0
    reasoning: str

@router.post("/analyze/chat", response_model=ChatAnalyzeResponse, dependencies=[Depends(verify_api_key)])
async def analyze_chat(request: ChatAnalyzeRequest):
    """
    Analyze chat context and return structured insights.
    Phase 1: Deterministic analysis (no LLM, no DB reads).
    """
    # Phase 1: Simple deterministic analysis
    facts = []
    anomalies = []
    actions = []
    
    # Example: Detect CTR changes
    if "metrics" in request.context:
        metrics = request.context["metrics"]
        if "ctr" in metrics and metrics.get("ctr_7d_ago"):
            ctr_change = metrics["ctr"] - metrics["ctr_7d_ago"]
            if abs(ctr_change) > 0.02:  # 2% change
                facts.append(Fact(
                    type="kpi_change",
                    description=f"CTR changed by {ctr_change*100:.1f}%",
                    value=ctr_change,
                    period="7d"
                ))
    
    return ChatAnalyzeResponse(
        facts=facts,
        anomalies=anomalies,
        actions=actions,
        confidence=0.8,
        reasoning="Deterministic analysis based on provided context"
    )
```

#### **File:** `services/intel/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, analyze

app = FastAPI(title="Bureau-AI Intel Service", version="0.1.0")

# CORS (allow Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analyze.router, prefix="/analyze")

@app.get("/")
async def root():
    return {"service": "intel", "status": "ok"}
```

---

### E3. Render Deployment

**Render service config:**
- **Name:** `bureau-ai-intel`
- **Environment:** Python 3
- **Root Directory:** `services/intel`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment variables:**
```bash
INTEL_API_KEY=<generate-with-openssl-rand-base64-32>
PORT=10000  # Render sets this automatically
```

**Internal URL:** `https://bureau-ai-intel.onrender.com` (or Render-assigned URL)

---

## F) Next.js Integration for Intel Chat

### F1. Intel Client Wrapper

#### **File:** `lib/intel-client.ts`

```typescript
interface IntelAnalyzeRequest {
  tenant: { userId: string; workspaceId: string };
  projectId: string | null;
  scope: string;
  message: string;
  context: {
    metrics?: any[];
    insights?: any[];
    kpis?: any;
  };
}

interface IntelAnalyzeResponse {
  facts: Array<{ type: string; description: string; value?: number; period: string }>;
  anomalies: Array<{ type: string; description: string; value?: number; period: string }>;
  actions: Array<{ priority: string; description: string; reasoning: string }>;
  confidence: number;
  reasoning: string;
}

export function isIntelEnabled(): boolean {
  return process.env.DATAHUB_INTEL_ENABLED === "true";
}

export async function callIntel(
  request: IntelAnalyzeRequest
): Promise<IntelAnalyzeResponse | null> {
  if (!isIntelEnabled()) {
    return null;
  }
  
  const baseUrl = process.env.INTEL_BASE_URL;
  if (!baseUrl) {
    console.warn("[intel] INTEL_BASE_URL not configured");
    return null;
  }
  
  const apiKey = process.env.INTEL_API_KEY;
  if (!apiKey) {
    console.warn("[intel] INTEL_API_KEY not configured");
    return null;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    
    const response = await fetch(`${baseUrl}/analyze/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Intel-API-Key": apiKey,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[intel] HTTP ${response.status}: ${await response.text()}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[intel] Request timeout (2s)");
    } else {
      console.error("[intel] Request failed:", error);
    }
    return null;
  }
}
```

---

### F2. Chat Route Integration

#### **File:** `app/api/chat/route.ts` (modify existing)

**Current behavior (lines 98-281):**
- Builds deterministic `assistantReply` from metrics/insights
- Optionally enriches with OpenAI `generateText()`

**New behavior:**
- After building context (line 147 for MASTER, line 218 for provider scope):
  - Call `callIntel()` if enabled
  - If intel returns facts/actions, include in OpenAI prompt
  - Fallback to deterministic reply if intel fails

**Insertion point (after line 146, before OpenAI enrichment):**
```typescript
// ... existing code builds allKpis, allInsights ...

// Intel analysis (optional, kill-switch enabled)
let intelAnalysis = null;
if (isIntelEnabled()) {
  try {
    intelAnalysis = await callIntel({
      tenant: {
        userId: user.id,
        workspaceId: workspace.id,
      },
      projectId: null,
      scope: "MASTER",
      message: message,
      context: {
        metrics: allKpis,
        insights: allInsights,
      },
    });
  } catch (e) {
    console.error("[CHAT][INTEL] error", e);
    // Continue with fallback
  }
}

// OpenAI enrichment (existing code, line 170-194)
// Modify system prompt to include intel analysis if available
const system = intelAnalysis
  ? `Je bent de AgentHub Data Hub assistent. Antwoord in het Nederlands, kort, concreet en actiegericht.
  
Gebruik de volgende geanalyseerde inzichten:
${JSON.stringify(intelAnalysis.facts, null, 2)}
${JSON.stringify(intelAnalysis.actions, null, 2)}

Gebruik ALLEEN de meegegeven context. Verzin geen nieuwe cijfers.`
  : `Je bent de AgentHub Data Hub assistent. Antwoord in het Nederlands, kort, concreet en actiegericht. Gebruik de context om de vraag van de gebruiker te beantwoorden.`;

// ... rest of OpenAI call (existing code) ...
```

**Same pattern for provider scope (after line 217).**

---

## G) Step-by-Step Checklist

### Phase 1: OAuth Foundation (Week 1)

1. ✅ **Create crypto helper** (`lib/crypto.ts`)
   - Implement AES-256-GCM encryption
   - Add `DATAHUB_ENCRYPTION_KEY` to env

2. ✅ **Create OAuth state helper** (`lib/oauth-state.ts`)
   - Store OAuth state in DB or session
   - Generate/verify state tokens

3. ✅ **Create Google OAuth helper** (`lib/google-oauth.ts`)
   - Build OAuth URLs
   - Exchange code for tokens
   - Fetch user info

4. ✅ **Create OAuth start route** (`app/api/oauth/google/start/route.ts`)
   - Generate state, build OAuth URL
   - Redirect to Google

5. ✅ **Create OAuth callback route** (`app/api/oauth/google/callback/route.ts`)
   - Verify state, exchange code
   - Encrypt and store tokens
   - Update Connection

6. ✅ **Update ChannelCard UI** (`components/ChannelCard.tsx`)
   - Add OAuth redirect on Connect
   - Show loading state

7. ✅ **Test OAuth flow**
   - Connect Google Ads account
   - Verify tokens stored (encrypted)

---

### Phase 2: Account Selection (Week 1-2)

8. ✅ **Create accounts list route** (`app/api/oauth/google/accounts/route.ts`)
   - Fetch GA4 properties / Google Ads accounts
   - Return list to UI

9. ✅ **Create account selection route** (`app/api/data/select-account/route.ts`)
   - Update Connection.authJson with selectedAccountIds

10. ✅ **Create AccountSelectionModal** (`components/AccountSelectionModal.tsx`)
    - Show accounts list
    - Allow selection
    - Call select-account API

11. ✅ **Integrate modal in ChannelCard**
    - Show after OAuth callback
    - Trigger sync after selection

---

### Phase 3: Data Ingest (Week 2)

12. ✅ **Create sync route** (`app/api/data/sync/route.ts`)
    - Check kill switch
    - Call n8n webhook with tenant context

13. ✅ **Create internal tokens endpoint** (`app/api/internal/connection-tokens/route.ts`)
    - Service key auth
    - Return decrypted tokens

14. ✅ **Create internal metrics write endpoint** (`app/api/internal/metrics/write/route.ts`)
    - Service key auth
    - Write MetricDaily rows

15. ✅ **Create n8n workflow stub**
    - Receive webhook from Next.js
    - Fetch tokens from internal endpoint
    - Call Google API (mock for now)
    - Write demo MetricDaily via internal endpoint

16. ✅ **Test ingest flow**
    - Trigger sync from UI
    - Verify metrics appear in Data Hub

---

### Phase 4: Intel Service (Week 3)

17. ✅ **Create FastAPI service structure** (`services/intel/`)
    - FastAPI app, health endpoint
    - Analyze endpoint stub

18. ✅ **Deploy to Render**
    - Create Python service
    - Set env vars
    - Verify health endpoint

19. ✅ **Create intel client** (`lib/intel-client.ts`)
    - Wrapper with kill switch
    - Timeout handling
    - Error handling

20. ✅ **Integrate in chat route** (`app/api/chat/route.ts`)
    - Call intel after context build
    - Include intel output in OpenAI prompt
    - Fallback to deterministic reply

21. ✅ **Test intel integration**
    - Send chat message
    - Verify intel called (logs)
    - Verify enhanced reply

---

### Phase 5: Polish & Deploy (Week 3-4)

22. ✅ **Add error handling**
    - Token refresh logic
    - Sync retry logic
    - Intel fallback

23. ✅ **Add monitoring**
    - Log OAuth flows
    - Log sync runs
    - Log intel calls

24. ✅ **Update documentation**
    - OAuth setup guide
    - n8n workflow guide
    - Intel service guide

25. ✅ **Production deployment**
    - Set all env vars
    - Enable kill switches
    - Monitor logs

---

## H) Risks and Mitigations

### H1. Token Leaks

**Risk:** OAuth tokens exposed in logs, webhooks, or DB queries.

**Mitigation:**
- ✅ Encrypt all tokens before storing (AES-256-GCM)
- ✅ Never log decrypted tokens
- ✅ Use internal endpoints for token access (service key auth)
- ✅ Rotate encryption key periodically

---

### H2. Refresh Token Handling

**Risk:** Access tokens expire, refresh fails, connection breaks.

**Mitigation:**
- ✅ Store refresh tokens (encrypted)
- ✅ Implement token refresh in n8n workflow (before API calls)
- ✅ Update Connection.authJson with new tokens after refresh
- ✅ Set Connection.status to "ERROR" if refresh fails
- ✅ Show error in UI, allow re-connect

---

### H3. Multi-Tenant Bugs

**Risk:** Workspace isolation broken, data leaks between tenants.

**Mitigation:**
- ✅ All queries filter by `workspaceId` (already enforced)
- ✅ Internal endpoints verify workspace exists
- ✅ n8n receives tenant object, never queries by userId alone
- ✅ Add integration tests for tenant isolation

---

### H4. Provider Account Selection UX

**Risk:** User confused by account selection, selects wrong account.

**Mitigation:**
- ✅ Show clear account names + IDs
- ✅ Allow re-selection (update Connection.authJson)
- ✅ Show selected account in UI
- ✅ Add "Change account" button

---

### H5. Ingest Failures & Retries

**Risk:** n8n workflow fails, metrics not updated, stale data.

**Mitigation:**
- ✅ n8n workflow logs errors to RunLog (or separate SyncLog table)
- ✅ Show last sync time in UI
- ✅ Allow manual sync trigger
- ✅ Implement retry logic in n8n (exponential backoff)
- ✅ Alert on repeated failures

---

### H6. Rate Limits & OpenAI Cost Control

**Risk:** Too many API calls, rate limits hit, high OpenAI costs.

**Mitigation:**
- ✅ Rate limit sync endpoint (1 sync per provider per 15min)
- ✅ Cache intel responses (same context = same response)
- ✅ Set OpenAI max tokens in prompts
- ✅ Monitor OpenAI usage in logs
- ✅ Add cost alerts

---

### H7. Rollback Plans

**Risk:** OAuth breaks, ingest breaks, intel breaks.

**Mitigation:**
- ✅ Kill switches for all features:
  - `DATAHUB_OAUTH_ENABLED=false` → Fallback to mock connect
  - `DATAHUB_INGEST_ENABLED=false` → Sync endpoint returns 503
  - `DATAHUB_INTEL_ENABLED=false` → Intel calls return null, fallback to deterministic
- ✅ Feature flags in UI (hide OAuth buttons if disabled)
- ✅ Database rollback: Clear `authJson`, set status to NOT_CONNECTED
- ✅ Code rollback: Revert commits, redeploy

---

## I) Questions (None - Plan is Complete)

**No questions.** All implementation details are specified with concrete file paths, existing patterns, and current codebase structure.

---

## J) Final Notes

**Implementation order:**
1. OAuth (enables account connections)
2. Account selection (enables data targeting)
3. Ingest (enables data display)
4. Intel (enhances chat)

**Each phase is independently deployable with kill switches.**

**LinkedIn/Blog generators remain untouched** (separate code paths, no conflicts).

---

**Status:** ✅ **Plan OK - Ready for implementation**

