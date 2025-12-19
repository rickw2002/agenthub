# Bureau-AI Intel Service

FastAPI service for OAuth, data sync, and intelligence analysis for Data Hub.

## Local Development

### Setup

1. Create virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file (optional, can use system env vars):
```bash
# Required for protected endpoints
INTEL_API_KEY=dev-key
CRON_SECRET=dev-secret

# Optional
NEXTJS_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

### Run

```bash
uvicorn app.main:app --reload --port 8001
```

Or use the npm script from project root:
```bash
npm run intel:dev
```

Service will be available at: http://localhost:8001

## Required Environment Variables

**Core:**
- `INTEL_API_KEY` - API key for `/analyze` and `/providers` endpoints (required for protected routes)
- `CRON_SECRET` - Secret for `/internal/cron` endpoints (required for protected routes)

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (required for OAuth and sync)

**Encryption:**
- `ENCRYPTION_KEY` - Base64-encoded 32-byte key for AES-256-GCM token encryption (required for OAuth)

**Google OAuth:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for GA4 OAuth)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required for GA4 OAuth)
- `GOOGLE_REDIRECT_URI` - Google OAuth redirect URI (required for GA4 OAuth)
  - Format: `https://<intel-service-url>/oauth/ga4/callback`
  - Example: `https://bureau-ai-intel.onrender.com/oauth/ga4/callback`

**External Services:**
- `NEXTJS_BASE_URL` - Base URL of Next.js app (required for OAuth redirects)
  - Example: `https://bureau-ai-nextjs.onrender.com` or `http://localhost:3000`

## API Endpoints

### Health Check

```bash
curl http://localhost:8001/health
```

Response:
```json
{
  "status": "ok",
  "service": "intel",
  "version": "0.1.0"
}
```

### Internal Cron (Protected)

```bash
curl -X POST http://localhost:8001/internal/cron/sync-daily \
  -H "X-Cron-Secret: dev-secret"
```

Response:
```json
{
  "status": "noop",
  "message": "sync not implemented yet"
}
```

### Chat Analysis (Protected)

```bash
curl -X POST http://localhost:8001/analyze/chat \
  -H "X-Intel-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": {
      "userId": "user_123",
      "workspaceId": "workspace_456"
    },
    "scope": "MASTER",
    "message": "What are my top KPIs?",
    "context": {}
  }'
```

Response:
```json
{
  "ok": true,
  "facts": [],
  "actions": [],
  "warnings": ["stub"]
}
```

### OAuth GA4 Start (Stub)

```bash
curl "http://localhost:8001/oauth/ga4/start?workspaceId=workspace_123&userId=user_456"
```

Response:
```json
{
  "status": "noop",
  "message": "oauth start not implemented yet",
  "workspaceId": "workspace_123",
  "userId": "user_456"
}
```

## Daily Sync (Cron)

### Manual Sync Trigger

Test the sync endpoint manually:

```bash
curl -X POST "http://localhost:8001/internal/cron/sync-daily" \
  -H "X-Cron-Secret: dev-secret" \
  -H "Content-Type: application/json" \
  -d '{"provider": "GOOGLE_ANALYTICS"}'
```

Response:
```json
{
  "status": "success",
  "synced": 2,
  "failed": 0,
  "failures": []
}
```

### Render Cron Configuration

Set up a Render Cron Job to call the sync endpoint daily:

**Cron Schedule:** `0 2 * * *` (2 AM UTC daily)

**Command:**
```bash
curl -X POST "https://<intel-service-url>/internal/cron/sync-daily" \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"provider": "GOOGLE_ANALYTICS"}'
```

**Environment Variables:**
- `CRON_SECRET` - Must match the secret used in the curl command

### Verify Sync Results

Check MetricDaily rows in Postgres:

```sql
-- Check latest GA4 metrics
SELECT 
  "workspaceId",
  provider,
  "date",
  "metricsJson",
  "dimensionsJson",
  "updatedAt"
FROM "MetricDaily"
WHERE provider = 'GOOGLE_ANALYTICS'
ORDER BY "date" DESC, "updatedAt" DESC
LIMIT 10;
```

```sql
-- Count metrics per workspace
SELECT 
  "workspaceId",
  COUNT(*) as metric_count,
  MIN("date") as first_date,
  MAX("date") as last_date
FROM "MetricDaily"
WHERE provider = 'GOOGLE_ANALYTICS'
GROUP BY "workspaceId"
ORDER BY metric_count DESC;
```

## Deployment

This service is designed to be deployed on Render as a separate Python service.

**Render Configuration:**
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `cd /opt/render/project/src/services/intel && PYTHONPATH=. python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Root Directory:** `services/intel`

**Alternative Start Command (if above doesn't work):**
- `bash start.sh`

**Required Environment Variables on Render:**
- `DATABASE_URL` - Same Postgres as Next.js
- `ENCRYPTION_KEY` - Base64-encoded 32-byte key (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_REDIRECT_URI` - `https://<intel-service-url>/oauth/ga4/callback`
- `NEXTJS_BASE_URL` - `https://<nextjs-service-url>`
- `INTEL_API_KEY` - Same value as in Next.js env
- `CRON_SECRET` - For cron endpoints (must match Render Cron Job secret)

