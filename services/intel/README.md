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
  - Format: `postgresql://user:password@host:5432/database?sslmode=require`
  - For Supabase: Use the "Connection string" from Supabase Dashboard → Settings → Database
  - Must include `?sslmode=require` for Supabase/cloud Postgres
  - Example: `postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require`

**Encryption:**
- `ENCRYPTION_KEY` - Base64-encoded 32-byte key for AES-256-GCM token encryption (required for OAuth)
  - Generate with: `openssl rand -base64 32`
  - Example output: `K8j3mP9qR2vX5nL7wT4yU6zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z=`

**Google OAuth:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for GA4 OAuth)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (required for GA4 OAuth)
- `GOOGLE_REDIRECT_URI` or `GOOGLE_OAUTH_REDIRECT_URL` - Google OAuth redirect URI (required for GA4 OAuth)
  - Both names are supported for backwards compatibility
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

### Configuration Status (Protected)

Check OAuth configuration status (requires Intel API key):

```bash
curl http://localhost:8001/health/config \
  -H "X-Intel-API-Key: dev-key"
```

Response:
```json
{
  "oauthConfigured": true,
  "missing": []
}
```

If OAuth is not configured:
```json
{
  "oauthConfigured": false,
  "missing": ["GOOGLE_REDIRECT_URI (or GOOGLE_OAUTH_REDIRECT_URL)"]
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

**For OAuth Flow (GA4):**
- `DATABASE_URL` - Same Postgres as Next.js (required)
- `ENCRYPTION_KEY` - Base64-encoded 32-byte key (required)
  - Generate: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console (required)
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console (required)
- `GOOGLE_REDIRECT_URI` or `GOOGLE_OAUTH_REDIRECT_URL` - `https://<intel-service-url>/oauth/ga4/callback` (required)
  - Both names are supported (use whichever matches your Render setup)

**For Service Operation:**
- `NEXTJS_BASE_URL` - `https://<nextjs-service-url>` (required for OAuth redirects)
- `INTEL_API_KEY` - Same value as in Next.js env (required for protected endpoints)
- `CRON_SECRET` - For cron endpoints (required, must match Render Cron Job secret)

**For Intelligence & Weekly Reports:**
- `OPENAI_API_KEY` - OpenAI API key (required for intelligence generation and weekly reports)
- `OPENAI_MODEL` - Model name (optional, defaults to `gpt-4.1-mini`)

**Quick Setup Checklist:**
1. Generate `ENCRYPTION_KEY`: `openssl rand -base64 32`
2. Set all OAuth vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (or `GOOGLE_OAUTH_REDIRECT_URL`)
3. Set `DATABASE_URL` (same as Next.js)
4. Set `NEXTJS_BASE_URL`, `INTEL_API_KEY`, `CRON_SECRET`
5. Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) for intelligence/weekly reports

## Weekly Report Generation (Cron)

### Manual Trigger

Test the weekly report endpoint manually:

```bash
curl -X POST "http://localhost:8001/internal/cron/weekly-report" \
  -H "X-Cron-Secret: dev-secret" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "status": "success",
  "generated": 2,
  "failed": 0,
  "failures": [],
  "week_start": "2025-12-15T00:00:00",
  "week_end": "2025-12-21T23:59:59"
}
```

### Render Cron Configuration

Set up a Render Cron Job to generate weekly reports every Sunday at 18:00 Europe/Amsterdam (17:00 UTC in winter, 16:00 UTC in summer):

**Cron Schedule:** `0 17 * * 0` (Sunday 17:00 UTC, adjust for DST if needed)

**Command:**
```bash
curl -X POST "https://<intel-service-url>/internal/cron/weekly-report" \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

**Note:** The endpoint automatically calculates the last week (Monday 00:00 to Sunday 23:59:59) and generates reports for all active workspaces (workspaces with CONNECTED connections or Signals/InsightV2 in the last 30 days).

**Environment Variables:**
- `CRON_SECRET` - Must match the secret used in the curl command
- `OPENAI_API_KEY` - Required for LLM-based report generation

### Verify Weekly Reports

Check WeeklyReportV2 rows in Postgres:

```sql
-- Check latest weekly reports
SELECT 
  "workspaceId",
  "weekStart",
  "weekEnd",
  summary,
  "createdAt"
FROM "WeeklyReportV2"
ORDER BY "weekStart" DESC, "createdAt" DESC
LIMIT 10;
```

```sql
-- Count reports per workspace
SELECT 
  "workspaceId",
  COUNT(*) as report_count,
  MIN("weekStart") as first_week,
  MAX("weekStart") as last_week
FROM "WeeklyReportV2"
GROUP BY "workspaceId"
ORDER BY report_count DESC;
```

