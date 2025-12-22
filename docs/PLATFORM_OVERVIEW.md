# Bureau-AI Platform - Technische Overzicht

## Wat is het?

**Bureau-AI** is een SaaS-platform voor MKB-bedrijven dat drie kernfunctionaliteiten combineert:

1. **Data Hub** - Unified marketing data dashboard
2. **AI Agents & Workflows** - Automatisering van bedrijfsprocessen
3. **Content Generatie Engine** - Gepersonaliseerde content op basis van bedrijfsprofiel

## Waarde Proposition

### Data Hub
- **Probleem**: Marketing data zit verspreid over Google Analytics, Meta Ads, LinkedIn, etc.
- **Oplossing**: Eén dashboard dat alle kanalen centraliseert via OAuth integraties
- **Features**:
  - Real-time metrics (impressions, clicks, conversions, spend)
  - 7-dagen trends per kanaal
  - AI-powered insights en aanbevelingen
  - Channel-specifieke chat voor data queries

### AI Agents
- **Probleem**: Repetitieve taken en workflows zijn tijdrovend
- **Oplossing**: Pre-built agents (templates) die gebruikers kunnen activeren en configureren
- **Features**:
  - Catalogus van agent templates (Sales, Marketing, Operations)
  - UserAgents: geactiveerde instances per gebruiker
  - RunLogs: execution history en status tracking
  - n8n integration voor workflow execution

### Content Generatie (Bureau-AI)
- **Probleem**: Content genereren is tijdrovend en moeilijk consistent te houden
- **Oplossing**: LLM-powered content generator met gepersonaliseerd profiel
- **Features**:
  - Profile Cards: Voice, Audience, Offer, Constraints
  - Adaptive wizard voor profiel opbouw
  - Multi-channel output (LinkedIn, blog)
  - Quality gate met feedback loop

## Technische Architectuur

### Monorepo Structuur
```
/
├── app/                    # Next.js 14 App Router (frontend)
├── components/             # React components
├── lib/                    # Shared utilities, AI logic
├── prisma/                 # Database schema & migrations
├── services/
│   ├── intel/              # FastAPI service (OAuth, data sync)
│   └── agent-runtime/      # Python service (agent execution)
└── docs/                   # Documentation
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- NextAuth.js (Credentials provider)
- React Server Components + Client Components

**Backend Services:**
- **Intel Service** (FastAPI/Python):
  - OAuth flows (Google Analytics, etc.)
  - Daily data sync via cron
  - Token encryption (AES-256-GCM)
  - GA4 Data API integration
  
- **Agent Runtime** (Python):
  - Agent execution
  - OpenAI integration
  - Document RAG

**Database:**
- Supabase Postgres
- Prisma ORM
- Multi-tenant (workspace-based isolation)

**Infrastructure:**
- Render.com (hosting)
- Supabase (database + storage)
- Environment-based config (dev/prod)

### Data Model (Kern)

**Multi-Tenancy:**
- `User` → `Workspace` (1:N, owner)
- `Workspace` → `Connection` (data sources)
- `Workspace` → `MetricDaily` (time-series metrics)
- `Workspace` → `Insight` (AI-generated insights)
- `Workspace` → `ProfileCard` (content personalization)

**Data Hub Models:**
- `Connection`: OAuth tokens, provider status (GOOGLE_ANALYTICS, META_ADS, etc.)
- `MetricDaily`: Daily aggregated metrics per provider
- `Insight`: AI-generated insights per provider

**Agent Models:**
- `AgentTemplate`: Pre-built agent definitions
- `UserAgent`: Activated agent instances
- `RunLog`: Execution history

**Content Models:**
- `ProfileAnswer`: User responses to wizard questions
- `ProfileCard`: Synthesized profile (Voice, Audience, Offer, Constraints)
- `Output`: Generated content with quality metrics
- `Feedback`: User ratings → profile updates

### OAuth Flow (Data Hub)

1. User clicks "Verbinden" → redirect naar Intel service
2. Intel service: `/oauth/ga4/start` → creates PENDING Connection
3. Redirect naar Google OAuth consent
4. Google callback → `/oauth/ga4/callback`
5. Intel service: exchange code for tokens, fetch GA4 properties
6. Store encrypted tokens in Connection.authJson
7. Redirect terug naar Next.js: `/data/google-analytics?connected=1`
8. User selects property → status becomes CONNECTED
9. Daily sync: cron job fetches metrics via GA4 Data API

### Security

- **Token Encryption**: AES-256-GCM (ENCRYPTION_KEY)
- **API Keys**: INTEL_API_KEY, CRON_SECRET (header-based auth)
- **Multi-tenant Isolation**: Workspace-based row-level filtering
- **OAuth State**: CSRF protection via encrypted state in DB

### Deployment

**Render Services:**
1. **Next.js** (bureau-ai-nextjs):
   - Build: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start: `npm start`
   - Port: 3000 (prod) / localhost:3000 (dev)

2. **Intel Service** (bureau-ai-intel):
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root: `services/intel`
   - Port: 8001 (dev) / Render assigned (prod)

**Environment Variables:**
- `DATABASE_URL` / `DIRECT_URL`: Supabase Postgres
- `NEXTJS_BASE_URL`: Next.js app URL (voor OAuth redirects)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `ENCRYPTION_KEY`: Base64 32-byte key
- `INTEL_API_KEY` / `CRON_SECRET`: Service authentication

## Key Design Decisions

1. **Monorepo**: Alle services in één repo voor shared types en consistentie
2. **FastAPI voor OAuth**: Python heeft betere Google API libraries dan Node.js
3. **Prisma voor type safety**: TypeScript types gegenereerd uit schema
4. **Workspace-based tenancy**: Eenvoudige isolatie zonder complex RLS
5. **Encrypted authJson**: Tokens nooit in plaintext, altijd encrypted
6. **Server Components**: Next.js App Router voor optimale performance
7. **Daily sync pattern**: Idempotent upserts voor metrics (prevent duplicates)

## Current Status

✅ **Live & Working:**
- User auth (NextAuth)
- Data Hub OAuth (Google Analytics)
- GA4 property selection
- Daily sync endpoint (manual trigger)
- Multi-tenant data isolation

🚧 **In Development:**
- Automated daily sync (Render Cron)
- Additional providers (Meta Ads, LinkedIn)
- AI insights generation
- Content generation engine polish

## Development Workflow

**Local:**
```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Intel service
cd services/intel
.venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8001
```

**Database:**
```bash
# Migrations
npx prisma migrate dev --name <name>  # Dev
npx prisma migrate deploy              # Prod

# Generate Prisma Client
npx prisma generate
```

**Testing OAuth:**
1. Set `NEXTJS_BASE_URL=http://localhost:3000` in Intel service
2. Set `GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/ga4/callback` in Google Console
3. Both services running → test OAuth flow

