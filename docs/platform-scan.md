## 1) Runtime overview

- **Framework**: Next.js App Router (TypeScript)
  - `app/` met segmenten `(auth)` voor login/register en `(app)` voor ingelogde app-routes.
  - Server Components voor data fetching (`getServerSession`, Prisma) en Client Components voor interactieve UI.
- **Runtime / hosting** (assumption):
  - Wordt gebouwd als Node-server (geen `next export`), met dynamische rendering geforceerd waar nodig (`export const dynamic = "force-dynamic"` op verschillende API-routes en data-pagina's).
  - In README staan instructies voor deploy op Render als web service.
- **Database & ORM**: Prisma + PostgreSQL
  - Prisma schema: `prisma/schema.prisma` met modellen:
    - **Core**: `User`, `Workspace`, `WorkspaceContext`, `Organization`, `Membership`, `Project`
    - **Agents**: `AgentTemplate`, `UserAgent`, `RunLog`
    - **Data Hub**: `Connection`, `MetricDaily`, `Insight`, `ChatMessage`
    - **v2 Content Engine**: `Signal`, `InsightV2`, `ContentDraftV2`, `WeeklyReportV2`, `ContentFeedbackV2`
    - **Documents**: `Document`, `DocumentChunk`
    - **Profile System**: `ProfileAnswer`, `ProfileState`, `ProfileCard`
    - **Content Generation**: `Example`, `Output`, `Feedback`
    - **Projects**: `ProjectSettings`, `ProjectChat`, `ProjectChatMessage`
    - **Library**: `Prompt`
  - Datasource: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- **Auth**: NextAuth Credentials
  - Config in `lib/auth.ts` (assumption op basis van imports in meerdere files).
  - Helpers:
    - `lib/auth-helpers.ts`:
      - `getCurrentUser()` → `getServerSession(authOptions)` → `session?.user`.
      - `requireAuth()` → `getCurrentUser()` en returnt `NextResponse` 401 als niet ingelogd.
  - Protected layout: `app/(app)/layout.tsx` checkt `getServerSession(authOptions)` en redirect naar `/auth/login` als niet ingelogd.
- **Workspace-laag** (multi-tenant per user)
  - `lib/workspace.ts`:
    - `getOrCreateWorkspace(userId: string)` → zoekt eerste `Workspace` per `ownerId`, maakt anders `Workspace` aan met naam `"Mijn workspace"`.
  - Workspace wordt gebruikt in:
    - `app/(app)/dashboard/page.tsx` → redirect naar `/onboarding` als er geen geldige `WorkspaceContext` is.
    - Document-RAG APIs (`app/api/documents/*`) → workspace-isolatie.
    - Context API (`app/api/context/route.ts`) → gebruikt `getOrCreateWorkspace` om context per user op te slaan.
- **External services**
  - **Prisma Client**: `lib/prisma.ts` (assumption; standaard Next/Prisma setup).
  - **OpenAI**:
    - `lib/openai.ts` maakt een `OpenAI` client met `OPENAI_API_KEY` en `OPENAI_MODEL` (default `gpt-4.1-mini`).
    - `lib/ai.ts` biedt `generateText({ system, user, extraSystem, temperature })` als wrapper.
  - **Intel Service** (FastAPI):
    - `services/intel/` - FastAPI service voor OAuth, data sync, en intelligence analysis.
    - Endpoints: `/oauth/ga4/*` (OAuth flow), `/providers/*` (status/sync), `/intelligence/generate` (InsightV2), `/internal/cron/*` (daily sync, weekly reports).
    - Gebruikt `INTEL_API_KEY` en `CRON_SECRET` voor authenticatie.
    - Sync GA4 metrics naar `Signal` tabel (v2) en `MetricDaily` (backward compatibility).
  - **Agent Runtime Service** (FastAPI):
    - `services/agent-runtime/` - FastAPI service voor agent execution.
    - Endpoints: `/api/run`, `/api/callback`, `/api/verify`.
  - **n8n / externe agent-runner**:
    - `app/api/agents/run/route.ts` stuurt een fire-and-forget webhook naar `process.env.N8N_RUN_WEBHOOK_URL` met `{ runId, userAgentId }`.
    - `app/api/internal/run-context/route.ts` exposeert run-context (UserAgent + config) voor een externe service op basis van `AGENT_SERVICE_KEY` header.

---

## 2) Routes map (app pages + purpose)

**Root layout / global**  
- `app/layout.tsx`  
  - Publieke root layout (voor login/register/landing).  
- `app/page.tsx` (assumption)  
  - Waarschijnlijk landings- of redirectpagina naar `dashboard` (in inhoud niet bekeken in deze scan).

**Auth-segment `(auth)`**  
- `app/(auth)/layout.tsx`  
  - Layout voor de auth-routes, zonder ingelogde navigatie.
- `app/auth/login/page.tsx`  
  - Login-pagina met formulier, gebruikt NextAuth Credentials.
- `app/auth/register/page.tsx`  
  - Registratie-pagina met formulier, aanmaken van `User` + hashed password.

**App-segment `(app)` (alleen ingelogd)**  
Layout:
- `app/(app)/layout.tsx`  
  - Haalt `getServerSession(authOptions)` op; als geen sessie → `redirect("/auth/login")`.
  - Rendert `Navigation` en een main content area.

Pages:
- `app/(app)/dashboard/page.tsx`  
  - Haalt sessie op; als niet ingelogd → login.  
  - Zorgt dat `Workspace` bestaat via `getOrCreateWorkspace(session.user.id)`.  
  - Checkt `WorkspaceContext`; als leeg (`{}`) of ontbrekend → redirect `/onboarding`.  
  - Haalt `UserAgent[]` en laatste 10 `RunLog` entries op en rendert `DashboardContent`.

- `app/(app)/agents/page.tsx`  
  - Haalt alle `AgentTemplate` rows op (sort by `createdAt desc`).  
  - Rendert agents catalog via `AgentsCatalog` met filters en kaarten.

- `app/(app)/agents/[slug]/page.tsx`  
  - Dynamische detailpagina voor een specifieke `AgentTemplate` op basis van `slug`.  
  - Haalt template op; bij not-found wordt `not-found.tsx` gebruikt.  
  - Gebruikt `AgentDetail` component (tabs, video, uitleg) + `AgentConfigForm` om een `UserAgent` aan te maken via `/api/agents/activate`.

- `app/(app)/data/page.tsx`  
  - Data Hub overzichtspagina.  
  - Haalt verbindingen (`Connection`), metrics (`MetricDaily`), en inzichten (`Insight`) voor laatste 7 dagen en bouwt `overviewData`.  
  - Rendert `DataHubContent` met `MasterChat` (voor `/api/chat`) en `ChannelCard`s.

- `app/(app)/data/[provider]/page.tsx`  
  - Kanaal-detailpagina per provider (`GOOGLE_ADS`, `GOOGLE_ANALYTICS`, `META_ADS`, `LINKEDIN`, `WEBSITE`, `EMAIL`, `SUPPORT`).  
  - Mapt slug naar provider (helper `slugToProvider`) en gebruikt `/api/data/channel` om detaildata te halen (assumption: via client fetch of server data fetch).  
  - Toont "Sync nu" knop voor handmatige sync via Intel service.

- `app/(app)/[workspace]/content/page.tsx`  
  - Content Studio v2 pagina voor LinkedIn post drafts.
  - Haalt `ContentDraftV2` entries op en rendert `ContentStudioV2` component.
  - Ondersteunt genereren, bewerken, en feedback verzamelen.

- `app/(app)/[workspace]/reports/page.tsx`  
  - Weekly Reports v2 archive pagina.
  - Haalt `WeeklyReportV2` entries op en rendert `WeeklyReportsV2` component.
  - Toont scoreboard, insights, decisions, en risks.

- `app/(app)/bureau-ai/page.tsx`  
  - Bureau-AI content generation pagina (LinkedIn + Blog).
  - Ondersteunt modi: `brainstorm`, `thought-to-post`, `content-bank`.
  - Gebruikt ProfileCard voor voice/audience/offer context.
  - Genereert `Output` entries via `/api/generate/linkedin` en `/api/generate/blog`.

- `app/(app)/projects/page.tsx`  
  - Project overzichtspagina (binnen organization context).
  - Haalt alle `Project` entries op voor huidige organization.

- `app/(app)/projects/[projectId]/page.tsx`  
  - Project detailpagina met project-specifieke content generation en documenten.

- `app/(app)/onboarding/page.tsx`  
  - Multi-step onboarding wizard (4 stappen) om user/bedrijf-context in te vullen.  
  - Stuurt bij submit een `PATCH` request naar `/api/context` met `profileJson`, `goalsJson`, `preferencesJson`.  
  - Na succesvol opslaan → `router.push("/dashboard")`.

- `app/(app)/workflows/page.tsx`  
  - Placeholder "Workflows" pagina (titel + korte tekst).

- `app/(app)/library/page.tsx`  
  - Placeholder "Library" pagina (content niet uitgelezen, maar basic info). (assumption: enkel statische uitleg/resource overview.)

- `app/(app)/prompt-library/page.tsx`  
  - Prompt Library overzichtspagina voor organization-wide prompts.

- `app/(app)/prompt-library/[promptId]/page.tsx`  
  - Prompt detailpagina voor bewerken/gebruik.

- `app/(app)/support/page.tsx`  
  - Placeholder "Support" pagina (contact info / uitleg). (assumption.)

- `app/(app)/account/page.tsx`  
  - Account-pagina voor user-profiel / settings (inhoud niet volledig bekeken, assumption: basisprofiel en eventueel workspace info).

- `app/(app)/account/personalization/page.tsx`  
  - Personalization pagina voor ProfileCard building (foundations, examples, synthesis).

Navigatie:
- `components/Navigation.tsx`  
  - `navigationItems`:
    - `/dashboard`, `/data`, `/agents`, `/workflows`, `/library`, `/prompt-library`, `/support`, `/account`.
  - Active-item logica op basis van `usePathname()`.

---

## 3) API map (app/api routes + purpose + shape)

### Auth

- `app/api/auth/[...nextauth]/route.ts`  
  - NextAuth handler (Credentials provider).  
  - Request shape: standaard NextAuth (GET/POST afhankelijk van actie).  
  - Response: NextAuth sessions, callbacks, etc.

- `app/api/auth/register/route.ts`  
  - `POST /api/auth/register`  
  - Body (assumption, obv. gebruik in frontend):
    - `{ email: string, name: string, password: string }`  
  - Doet:
    - Valideert body.
    - Checkt of user al bestaat.
    - Maakt `User` aan met `passwordHash`.  
  - Response:
    - 201 `{ message: string }` bij succes  
    - 400/500 bij fouten.

### Agents

- `app/api/agents/activate/route.ts`  
  - `POST /api/agents/activate`  
  - Body:
    - `{ agentTemplateId: string, name: string, config?: string | object }`  
  - Doet:
    - Checkt sessie via `getServerSession(authOptions)`.
    - Valideert `agentTemplateId`, `name`.
    - Checkt of `AgentTemplate` bestaat.
    - Maakt `UserAgent` aan voor `session.user.id` met status `"active"` en `config` als string (`"{}"` default).  
  - Response:
    - 201 `{ message: "Agent succesvol geactiveerd", userAgentId }`  
    - 400/404/500 bij fouten.

- `app/api/agents/run/route.ts`  
  - `POST /api/agents/run`  
  - Body:
    - `{ userAgentId: string }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Valideert dat `userAgentId` bij ingelogde user hoort (geen leakage naar andere users).  
    - Maakt `RunLog` aan met `status: "running"`, `summary: "Run gestart voor <agentTemplate.name>"`.  
    - Fire-and-forget `fetch` naar `N8N_RUN_WEBHOOK_URL` met body `{ runId, userAgentId }`.  
    - Bij webhook-fout: update `RunLog.status = "failed"` met error-tekst.  
  - Response:
    - 201 `{ runId, status: "running" }`  
    - 400/401/404/500 bij fouten.

- `app/api/runs/callback/route.ts` (assumption op basis van naam, inhoud niet gescand)  
  - Waarschijnlijk endpoint voor n8n/externe agent-runner om een `RunLog` te updaten na run-completion (status, summary, errors, resultUrl).  
  - Shape: vermoedelijk `POST` met `{ runId, status, summary?, resultUrl?, error? }`.  

### Chat / Data Hub

- `app/api/chat/route.ts`  
  - `POST /api/chat`  
  - Body:
    - `{ scope: "MASTER" | "GOOGLE_ADS" | "META_ADS" | "LINKEDIN" | "WEBSITE" | "EMAIL" | "SUPPORT", message: string }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Valideert `scope` tegen `VALID_SCOPES` en niet-lege `message`.
    - Schrijft `ChatMessage` met `role: "USER"`.
    - Berekent een basisantwoord per scope:
      - `MASTER`: aggregate KPIs en insights uit meerdere providers (Google, Meta, LinkedIn) uit `MetricDaily` en `Insight`.  
      - Provider-scopes: haalt laatste metrics + insights per provider.
    - Probeert een AI-verrijking via `generateText()` met een systemprompt `"AgentHub Data Hub assistent"` en een JSON-context van KPIs/insights.
    - Fallback op deterministisch antwoord als OpenAI faalt.  
    - Schrijft `ChatMessage` met `role: "ASSISTANT"` en `content = assistantReply`.  
  - Response:
    - 201 `{ reply: string, messageId: string }`  
    - 400/401/500 bij fouten.

### Data Hub

- `app/api/data/overview/route.ts`  
  - `GET /api/data/overview`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Haalt alle `Connection` rows voor user, alle `MetricDaily` (laatste 7 dagen), alle `Insight`.  
    - Produceert `summaries` array per provider:
      - `provider`, `status`, `kpis`, `series7d`, `latestInsights`.  
  - Response:
    - 200 `{ summaries: Array<{ provider, status, kpis, series7d, latestInsights }> }`  
    - 401/500 bij fouten.

- `app/api/data/channel/route.ts`  
  - `GET /api/data/channel?provider=GOOGLE_ADS|...`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Valideert `provider` en haalt:
      - `Connection` voor user+provider.
      - Laatste 30 dagen `MetricDaily` voor user+provider → bouwt tijdreeks én KPIs.
      - Laatste 10 `Insight` entries voor provider.  
  - Response:
    - 200 `{ provider, connection, kpis, metrics: [...], insights: [...] }`  
    - 400/401/500 bij fouten.

- `app/api/data/connect/route.ts`  
  - `POST /api/data/connect`  
  - Body:
    - `{ provider: string }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Valideert provider ∈ `VALID_PROVIDERS`.
    - `upsert` van `Connection` row met `status: "CONNECTED"` en optioneel andere velden (authJson).  
  - Response:
    - 200 `{ success: true, connectionId, ... }` (assumption; exacte payload niet volledig gelezen).  

- `app/api/data/disconnect/route.ts`  
  - `POST /api/data/disconnect`  
  - Body:
    - `{ provider: string }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - Valideert provider.
    - `upsert` van `Connection` met `status: "NOT_CONNECTED"` en `authJson: null`.  
  - Response:
    - 200 `{ success: true, message: "Kanaal succesvol losgekoppeld" }`  
    - 400/401/500 bij fouten.

### Document RAG

- `app/api/documents/upload/route.ts`  
  - `POST /api/documents/upload`  
  - Body (assumption obv. gebruik in kop): `{ title?, fileUrl: string, fileName?: string }`.  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - `getOrCreateWorkspace(user.id)`.
    - Maakt `Document` aan met `status: "pending"` en slaat `fileUrl` op.  
  - Response:
    - 200 `{ documentId, workspaceId, status }`.

- `app/api/documents/process/route.ts`  
  - `POST /api/documents/process`  
  - Body:
    - `{ documentId: string, text: string }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - `getOrCreateWorkspace(user.id)`.
    - Checkt dat `Document` met `id=documentId` bij deze workspace hoort.  
    - Splitst `text` in stukken (`createChunks`) en schrijft `DocumentChunk` rows met placeholder `embedding`.  
    - Update `Document.status = "ready"`.  
  - Response:
    - 200 `{ documentId, workspaceId, chunks, status: "ready" }`.

- `app/api/documents/ask/route.ts`  
  - `POST /api/documents/ask`  
  - Body:
    - `{ question: string, documentId?: string, mode?: "summary" | "plan" | "checklist" | "qa" }`  
  - Doet:
    - `requireAuth()` + `getCurrentUser()`.
    - `getOrCreateWorkspace(user.id)`.
    - Valideert vraag en optioneel `documentId` binnen workspace.  
    - Zoekt relevante `DocumentChunk`s op basis van vraagwoorden (simpele keyword-retrieval) en fallback op recente chunks.  
    - Haalt `WorkspaceContext` (`profileJson`, `goalsJson`, `preferencesJson`) en bouwt prompt via `buildDocumentRagPrompt`.  
    - **Belangrijk**: Genereert nog geen echt OpenAI-antwoord; maakt een deterministische `simulatedAnswer` per `mode` (placeholder).  
  - Response:
    - 200 `{ question, mode, workspaceId, documentId, retrievedChunks, prompt, answer: simulatedAnswer }`.

### Context & Workspaces

- `app/api/context/route.ts`  
  - `GET /api/context`  
    - Gebruikt `getServerSession(authOptions)`.
    - Bepaalt workspace via `getOrCreateWorkspace(user.id)`.
    - Haalt `WorkspaceContext` op; als niet gevonden → 404 `"Geen workspace context gevonden"`.  
    - Response: `{ workspaceId, profileJson, goalsJson, preferencesJson, createdAt, updatedAt }`.
  - `PATCH /api/context`  
    - Verwacht body: `{ profileJson?, goalsJson?, preferencesJson? }` (elk string of object).  
    - Bepaalt workspace via `getOrCreateWorkspace(user.id)`.  
    - `upsert` op `WorkspaceContext` per `workspaceId`.  
    - Response: dezelfde shape als `GET`.  
  - Opmerkingen:
    - Aangeroepen vanuit onboarding en (voorheen) Copilot; nu hoofdzakelijk voor onboarding/context-setup.

### Internal / Service-to-service

- `app/api/internal/openai-ping/route.ts` (assumption obv. naam en gebruik van `generateText`)  
  - `GET /api/internal/openai-ping` of `POST` (inhoud niet volledig bekeken).  
  - Doet een test-call naar OpenAI via `generateText` om health-check te doen.  
  - Beveiligd met `INTERNAL_TOKEN` in headers of query (assumption).  

- `app/api/internal/run-context/route.ts`  
  - `GET /api/internal/run-context?userAgentId=...`  
  - Headers: `X-AGENT-SERVICE-KEY: <AGENT_SERVICE_KEY>`.  
  - Doet:
    - Validates service key.
    - Haalt `UserAgent` met bijbehorende `AgentTemplate` en parsed `config`.  
  - Response:
    - 200 `{ runId: null, userAgentId, agentTemplate: { name, slug, type }, config }`  
    - 400/401/404/500 bij fouten.

### v2 Content & Decision Engine

- `app/api/v2/content-drafts/route.ts`  
  - `GET /api/v2/content-drafts`  
    - Haalt alle `ContentDraftV2` entries op voor huidige workspace, inclusief `feedbacks`.
  - `POST /api/v2/content-drafts`  
    - Genereert 3 LinkedIn post drafts op basis van laatste `InsightV2` en `ProfileCard.voiceCard`.
    - Parseert `opportunities` uit `InsightV2` en maakt drafts met formaten: `story`, `insight`, `list`.
    - Response: `{ ok: true, created: number, drafts: ContentDraftV2[] }`.

- `app/api/v2/content-drafts/[id]/route.ts`  
  - `PATCH /api/v2/content-drafts/[id]`  
    - Update `title`, `body`, en `status` van een `ContentDraftV2`.
    - Valideert workspace ownership.

- `app/api/v2/content-feedback/route.ts`  
  - `POST /api/v2/content-feedback`  
    - Body: `{ contentDraftId: string, postedUrl?, impressions?, clicks?, reactions?, comments?, qualitativeRating?, notes? }`.
    - Maakt `ContentFeedbackV2` entry aan voor een gepubliceerde post.

- `app/api/v2/weekly-reports/route.ts`  
  - `GET /api/v2/weekly-reports`  
    - Haalt alle `WeeklyReportV2` entries op voor huidige workspace, gesorteerd op `weekStart` descending.

- `app/api/v2/weekly-reports/[id]/route.ts`  
  - `GET /api/v2/weekly-reports/[id]`  
    - Haalt één `WeeklyReportV2` op (met workspace ownership check).

### Projects & Organizations

- `app/api/projects/route.ts`  
  - `GET /api/projects`  
    - Haalt alle `Project` entries op voor huidige organization (via `getCurrentOrgId`).
  - `POST /api/projects`  
    - Body: `{ name: string, description?: string }`.
    - Maakt nieuw `Project` aan binnen huidige organization.

- `app/api/projects/[id]/route.ts`  
  - `GET /api/projects/[id]` - Haalt project details.
  - `PATCH /api/projects/[id]` - Update project.
  - `DELETE /api/projects/[id]` - Archive project (`isArchived = true`).

- `app/api/projects/[id]/settings/route.ts`  
  - `GET /api/projects/[id]/settings` - Haalt `ProjectSettings`.
  - `PATCH /api/projects/[id]/settings` - Update settings (bv. `useGlobalLibrary`).

- `app/api/projects/[id]/documents/route.ts`  
  - `GET /api/projects/[id]/documents` - Haalt project-specifieke documenten.
  - `POST /api/projects/[id]/documents` - Upload document voor project.

- `app/api/projects/[id]/chat/route.ts`  
  - `GET /api/projects/[id]/chat` - Haalt project chats.
  - `POST /api/projects/[id]/chat` - Maakt nieuwe project chat aan.

- `app/api/projects/[id]/chat/[chatId]/route.ts`  
  - `GET /api/projects/[id]/chat/[chatId]` - Haalt chat details.
  - `DELETE /api/projects/[id]/chat/[chatId]` - Verwijder chat.

- `app/api/projects/[id]/chat/[chatId]/send/route.ts`  
  - `POST /api/projects/[id]/chat/[chatId]/send` - Stuur bericht in project chat.

- `app/api/projects/[id]/chats/[chatId]/messages/route.ts`  
  - `GET /api/projects/[id]/chats/[chatId]/messages` - Haalt chat messages.

### Profile System (Bureau-AI)

- `app/api/profile/answer/route.ts`  
  - `POST /api/profile/answer`  
    - Body: `{ projectId?: string, questionKey: string, answerText: string, answerJson?: object }`.
    - Slaat `ProfileAnswer` op (workspace + optioneel project context).

- `app/api/profile/next-question/route.ts`  
  - `GET /api/profile/next-question?projectId=...`  
    - Bepaalt volgende foundation question op basis van `ProfileState`.

- `app/api/profile/synthesize/route.ts`  
  - `POST /api/profile/synthesize`  
    - Body: `{ projectId?: string }`.
    - Synthetiseert `ProfileCard` (voiceCard, audienceCard, offerCard, constraints) uit `ProfileAnswer` entries via LLM.
    - Maakt nieuwe `ProfileCard` versie aan.

### Content Generation

- `app/api/generate/linkedin/route.ts`  
  - `POST /api/generate/linkedin`  
    - Body: `{ projectId?: string, thought?: string, length?: "short" | "medium" | "long", postType?: "TOFU" | "MOFU" | "BOFU", funnelPhase?: string }`.
    - Genereert LinkedIn post via LLM op basis van `ProfileCard` en `Example` entries.
    - Maakt `Output` entry aan met `channel: "linkedin"`, `mode: "thought_to_post"`.
    - Gebruikt quality gate (`evaluateLinkedInQuality`) voor validatie.

- `app/api/generate/blog/route.ts`  
  - `POST /api/generate/blog`  
    - Body: `{ projectId?: string, topic?: string, length?: "short" | "medium" | "long" }`.
    - Genereert blog post via LLM.
    - Maakt `Output` entry aan met `channel: "blog"`.

- `app/api/generate/brainstorm/route.ts`  
  - `POST /api/generate/brainstorm`  
    - Body: `{ projectId?: string, topic?: string, channel?: "linkedin" | "blog" }`.
    - Genereert brainstorm ideeën.
    - Maakt `Output` entry aan met `mode: "brainstorm"`.

- `app/api/thought/interview/route.ts`  
  - `POST /api/thought/interview`  
    - Body: `{ projectId?: string, thought: string }`.
    - Genereert interview vragen voor een "thought" om ProfileCard te verrijken.

### Outputs & Feedback

- `app/api/outputs/route.ts`  
  - `GET /api/outputs?filter=all|favorites|sources&search=...&postType=...&funnelPhase=...&mode=...&channel=...&projectId=...`  
    - Haalt `Output` entries op met filters (favorites, search, postType, etc.).
    - Ondersteunt workspace + optioneel project context.

- `app/api/outputs/[id]/route.ts`  
  - `GET /api/outputs/[id]` - Haalt output details.
  - `DELETE /api/outputs/[id]` - Verwijder output.

- `app/api/outputs/[id]/favorite/route.ts`  
  - `POST /api/outputs/[id]/favorite` - Markeer output als favorite (update `inputJson.isFavorite`).
  - `DELETE /api/outputs/[id]/favorite` - Verwijder favorite markering.

- `app/api/output/feedback/route.ts`  
  - `POST /api/output/feedback`  
    - Body: `{ outputId: string, rating: number, notes?: string }`.
    - Maakt `Feedback` entry aan voor een `Output`.

### Proxy & Intel Service Integration

- `app/api/proxy/intel/route.ts`  
  - `GET /api/proxy/intel?path=...` - Proxy GET requests naar Intel service.
  - `POST /api/proxy/intel?path=...` - Proxy POST requests naar Intel service.
  - Gebruikt `NEXT_PUBLIC_INTEL_BASE_URL` en `INTEL_API_KEY` voor authenticatie.

### Library & Prompts

- `app/api/library/documents/route.ts`  
  - `GET /api/library/documents` - Haalt organization-wide documenten op.

- `app/api/prompts/route.ts`  
  - `GET /api/prompts` - Haalt `Prompt` entries op voor huidige organization.
  - `POST /api/prompts` - Maakt nieuwe prompt aan.

- `app/api/prompts/[id]/route.ts`  
  - `GET /api/prompts/[id]` - Haalt prompt details.
  - `PATCH /api/prompts/[id]` - Update prompt.
  - `DELETE /api/prompts/[id]` - Verwijder prompt.

### Overig

- `app/api/data/channel/route.ts` en `app/api/data/overview/route.ts` zijn hierboven al beschreven.
- `app/api/data/sync/` - (verwijderd) Handmatige sync trigger (nu via Intel service direct).
- Scripts `scripts/check-users.ts`, `scripts/test-login.ts` zijn CLI tools, geen HTTP routes.

---

## 4) Auth & workspace isolation

**Waar wordt `requireAuth` gebruikt?**

- `app/api/chat/route.ts`
- `app/api/documents/upload/route.ts`
- `app/api/documents/process/route.ts`
- `app/api/documents/ask/route.ts`
- `app/api/data/overview/route.ts`
- `app/api/data/channel/route.ts`
- `app/api/data/connect/route.ts`
- `app/api/data/disconnect/route.ts`
- `app/api/agents/run/route.ts`
- `app/api/v2/content-drafts/route.ts`
- `app/api/v2/content-drafts/[id]/route.ts`
- `app/api/v2/content-feedback/route.ts`
- `app/api/v2/weekly-reports/route.ts`
- `app/api/v2/weekly-reports/[id]/route.ts`
- `app/api/projects/route.ts`
- `app/api/profile/*/route.ts`
- `app/api/generate/*/route.ts`
- `app/api/outputs/route.ts`
- `app/api/prompts/route.ts`

Deze routes eisen een ingelogde user en gebruiken daarna `getCurrentUser()` voor userId.

**Workspace-isolatie**

- `lib/workspace.ts`  
  - `getOrCreateWorkspace(userId)` garandeert exact één (eerste) workspace per user.  

- `lib/organization.ts`  
  - `getCurrentOrgId(userId)` haalt organization ID op via `Membership` (of maakt default organization aan).

- API-routes die expliciet workspace-bewust zijn:
  - `app/api/context/route.ts`  
    - Bindt `WorkspaceContext` aan `workspace.id` (uniek per workspace).
  - `app/api/documents/upload/route.ts`  
    - Maakt `Document` met `workspaceId = workspace.id`.
  - `app/api/documents/process/route.ts`  
    - Zoekt `Document` met `id` én `workspaceId = workspace.id` zodat users geen documenten van anderen kunnen bewerken.
    - Maakt `DocumentChunk` met zowel `documentId` als `workspaceId`.
  - `app/api/documents/ask/route.ts`  
    - Vindt chunks met `workspaceId = workspace.id` en optioneel `documentId` in dezelfde workspace.
  - `app/api/v2/content-drafts/route.ts`  
    - Filtert `ContentDraftV2` op `workspaceId`.
  - `app/api/v2/weekly-reports/route.ts`  
    - Filtert `WeeklyReportV2` op `workspaceId`.
  - `app/api/profile/*/route.ts`  
    - Filtert `ProfileAnswer`, `ProfileState`, `ProfileCard` op `workspaceId` (+ optioneel `projectId`).
  - `app/api/generate/*/route.ts`  
    - Filtert `Example`, `ProfileCard` op `workspaceId` (+ optioneel `projectId`).
    - Maakt `Output` met `workspaceId` (+ optioneel `projectId`).
  - `app/api/outputs/route.ts`  
    - Filtert `Output` op `workspaceId` (+ optioneel `projectId`).

- API-routes met workspace + organization context:
  - `app/api/projects/route.ts`  
    - Filtert `Project` op `organizationId` (via `getCurrentOrgId`).
  - `app/api/prompts/route.ts`  
    - Filtert `Prompt` op `organizationId`.

- API-routes met workspace-isolatie (v2 Data Hub):
  - Data Hub v2: `Connection`, `MetricDaily`, `Insight`, `ChatMessage` hebben nu ook `workspaceId` (naast `userId`).
  - `Signal`, `InsightV2`, `WeeklyReportV2` zijn workspace-geïsoleerd.

- API-routes met user-isolatie via userId (zonder expliciet workspace):
  - Agents: `UserAgent`, `RunLog` → altijd gefilterd op `userId = currentUser.id` of via relaties (`userAgent.userId = currentUser.id`).

Conclusie:  
- Auth is gecentraliseerd in `lib/auth-helpers.ts` en enforced in vrijwel alle API-routes met user-data.  
- Workspace-isolatie is nu de standaard voor alle content/data flows (v2 modellen, documents, profile, outputs).
- Organization-isolatie wordt gebruikt voor projects en prompts (multi-tenant binnen organization).
- Agents blijven user-geïsoleerd (1 workspace per user, maar workspace wordt niet expliciet gebruikt in queries).

---

## 5) DB overview (belangrijkste Prisma modellen & relaties)

### User & auth-gerelateerd

- `User`  
  - Velden: `id`, `email`, `name`, `passwordHash`, timestamps.  
  - Relaties:
    - `userAgents: UserAgent[]`
    - `connections: Connection[]`
    - `metricDailies: MetricDaily[]`
    - `insights: Insight[]`
    - `chatMessages: ChatMessage[]`
    - `workspaces: Workspace[]`
    - `memberships: Membership[]`

### Agents & runs

- `AgentTemplate`  
  - Blueprint voor een agent/workflow.  
  - Velden: `name`, `slug`, `category`, `shortDescription`, `longDescription`, `type` ("agent" of "workflow"), `difficulty`, `videoUrl?`, `configSchema` (JSON-as-string), `executor` (default "n8n"), `n8nWorkflowId?`, `n8nWebhookPath?`, timestamps.  
  - Relaties: `userAgents: UserAgent[]`.

- `UserAgent`  
  - Concrete geactiveerde agent per user.  
  - Velden: `userId`, `agentTemplateId`, `name`, `config` (JSON-as-string), `status` ("active"/"inactive"/"incomplete").  
  - Relaties: `user: User`, `agentTemplate: AgentTemplate`, `runLogs: RunLog[]`.

- `RunLog`  
  - Log van agent-executies.  
  - Velden: `id`, `userAgentId`, `status` ("queued" | "running" | "success" | "failed"), `summary?`, `resultUrl?`, `error?`, `metadata?` (JSON-as-string), `executor` (default "n8n"), `externalRunId?`, timestamps.  
  - Relatie: `userAgent: UserAgent`.

### Data Hub

- `Connection`  
  - Per workspace+provider connectiestatus.  
  - Velden: `userId`, `workspaceId`, `provider`, `status`, `authJson?`.  
  - Relaties: `user: User`, `workspace: Workspace`.  
  - Uniek: `@@unique([userId, provider])`, `@@unique([workspaceId, provider])`.

- `MetricDaily`  
  - Dagelijkse metrics snapshot per workspace+provider.  
  - Velden: `userId`, `workspaceId`, `provider`, `date`, `metricsJson`, `dimensionsJson?`.  
  - Relaties: `user: User`, `workspace: Workspace`.

- `Insight`  
  - Inzichten/suggestions per workspace en optioneel provider.  
  - Velden: `userId`, `workspaceId`, `provider?`, `title`, `summary`, `severity`, `period?`, `dataRefJson?`.  
  - Relaties: `user: User`, `workspace: Workspace`.

- `ChatMessage`  
  - Conversatielog voor Master/Data chat.  
  - Velden: `userId`, `workspaceId`, `scope`, `role`, `content`, `createdAt`.  
  - Relaties: `user: User`, `workspace: Workspace`.

### v2 Content & Decision Engine

- `Signal`  
  - Provider-agnostische metrics (unified data layer).  
  - Velden: `workspaceId`, `type` ('TRAFFIC' | 'ENGAGEMENT' | 'CONVERSION' | 'COST' | 'CONTENT' | 'REVENUE'), `sourceProvider` ('GA4' | 'META' | 'LINKEDIN' | 'MANUAL' | ...), `periodStart`, `periodEnd`, `key` (e.g. 'sessions', 'spend'), `value`, `unit` ('count' | 'eur' | 'seconds' | 'percent'), `dimensions` (JSON).  
  - Relatie: `workspace: Workspace`.  
  - Indexes: `[workspaceId, type]`, `[workspaceId, sourceProvider]`, `[workspaceId, periodStart, periodEnd]`.

- `InsightV2`  
  - LLM-generated insights met observations, hypotheses, en opportunities.  
  - Velden: `workspaceId`, `periodStart`, `periodEnd`, `observations` (JSON), `hypotheses` (JSON), `opportunities` (JSON), `sources` (JSON).  
  - Relaties: `workspace: Workspace`, `drafts: ContentDraftV2[]`.  
  - Index: `[workspaceId, periodStart, periodEnd]`.

- `ContentDraftV2`  
  - LinkedIn post drafts (extensible naar andere types).  
  - Velden: `workspaceId`, `type` ('LINKEDIN_POST'), `title`, `body`, `format` ('story' | 'insight' | 'list'), `voiceCardVersion` (JSON), `basedOnInsightId?`, `sources` (JSON), `status` ('DRAFT' | 'APPROVED' | 'POSTED').  
  - Relaties: `workspace: Workspace`, `basedOnInsight: InsightV2?`, `feedbacks: ContentFeedbackV2[]`.  
  - Indexes: `[workspaceId]`, `[workspaceId, status, createdAt]`, `[basedOnInsightId]`.

- `WeeklyReportV2`  
  - Wekelijkse samenvattingen met scoreboard, insights, decisions, en risks.  
  - Velden: `workspaceId`, `weekStart`, `weekEnd`, `summary`, `scoreboard` (JSON), `insights` (JSON), `decisions` (JSON), `risks` (JSON).  
  - Relatie: `workspace: Workspace`.  
  - Index: `[workspaceId, weekStart, weekEnd]`.

- `ContentFeedbackV2`  
  - Post-publication feedback voor content drafts.  
  - Velden: `workspaceId`, `contentDraftId`, `postedUrl?`, `impressions?`, `clicks?`, `reactions?`, `comments?`, `qualitativeRating?` ('GOOD' | 'OK' | 'BAD'), `notes?`.  
  - Relaties: `workspace: Workspace`, `contentDraft: ContentDraftV2`.  
  - Indexes: `[workspaceId]`, `[contentDraftId]`.

### Workspace & documenten

- `Workspace`  
  - Multi-tenant container per user (kan optioneel bij organization horen).  
  - Velden: `id`, `name`, `ownerId`, `organizationId?`, timestamps.  
  - Relaties: 
    - `owner: User`, `organization: Organization?`
    - `context: WorkspaceContext?`
    - `documents: Document[]`, `chunks: DocumentChunk[]`
    - `profileAnswers: ProfileAnswer[]`, `profileStates: ProfileState[]`, `profileCards: ProfileCard[]`
    - `examples: Example[]`, `outputs: Output[]`
    - `connections: Connection[]`, `metricDailies: MetricDaily[]`, `insights: Insight[]`, `chatMessages: ChatMessage[]`
    - `signals: Signal[]`, `insightsV2: InsightV2[]`, `contentDraftsV2: ContentDraftV2[]`, `weeklyReportsV2: WeeklyReportV2[]`, `contentFeedbacksV2: ContentFeedbackV2[]`.

- `WorkspaceContext`  
  - Lichte profiel-/doelen-/voorkeuren-context voor AI/RAG.  
  - Velden: `workspaceId @unique`, `profileJson`, `goalsJson`, `preferencesJson`, timestamps.  
  - Relatie: `workspace: Workspace`.

- `Document`  
  - Document-per-workspace entry (kan optioneel bij organization/project horen).  
  - Velden: `workspaceId`, `organizationId?`, `projectId?`, `scope` ('GLOBAL' | 'PROJECT'), `title`, `fileUrl`, `status` ('uploaded' | 'processing' | 'ready' | 'failed'), `error?`.  
  - Relaties: `workspace: Workspace`, `organization: Organization?`, `project: Project?`, `chunks: DocumentChunk[]`.

- `DocumentChunk`  
  - Tekstchunks van een document.  
  - Velden: `documentId`, `workspaceId`, `organizationId?`, `projectId?`, `scope` ('GLOBAL' | 'PROJECT'), `chunkIndex`, `text`, `embedding?`, `createdAt`.  
  - Relaties: `document: Document`, `workspace: Workspace`, `organization: Organization?`, `project: Project?`.  
  - Uniek: `@@unique([documentId, chunkIndex])`.

### Organizations & Projects

- `Organization`  
  - Multi-user organization container.  
  - Velden: `id`, `name`, timestamps.  
  - Relaties: `memberships: Membership[]`, `workspaces: Workspace[]`, `projects: Project[]`, `documents: Document[]`, `chunks: DocumentChunk[]`, `prompts: Prompt[]`.

- `Membership`  
  - User membership in organization.  
  - Velden: `id`, `organizationId`, `userId`, `role` ('OWNER' | 'MEMBER' | 'VIEWER'), `createdAt`.  
  - Relaties: `organization: Organization`, `user: User`.  
  - Uniek: `@@unique([organizationId, userId])`.

- `Project`  
  - Project binnen organization (optioneel workspace context).  
  - Velden: `id`, `organizationId`, `name`, `description?`, `isArchived`, timestamps.  
  - Relaties: `organization: Organization`, `settings: ProjectSettings?`, `chats: ProjectChat[]`, `documents: Document[]`, `chunks: DocumentChunk[]`, `profileAnswers: ProfileAnswer[]`, `profileStates: ProfileState[]`, `profileCards: ProfileCard[]`, `examples: Example[]`, `outputs: Output[]`.

- `ProjectSettings`  
  - Project-specifieke instellingen.  
  - Velden: `id`, `projectId @unique`, `useGlobalLibrary`, timestamps.  
  - Relatie: `project: Project`.

- `ProjectChat`  
  - Chat conversatie binnen project.  
  - Velden: `id`, `projectId`, `title?`, timestamps.  
  - Relaties: `project: Project`, `messages: ProjectChatMessage[]`.

- `ProjectChatMessage`  
  - Bericht in project chat.  
  - Velden: `id`, `projectChatId`, `role`, `content`, `sourcesJson?`, `metaJson?`, `createdAt`.  
  - Relatie: `chat: ProjectChat`.

### Profile System (Bureau-AI)

- `ProfileAnswer`  
  - Antwoorden op foundation questions (workspace + optioneel project context).  
  - Velden: `id`, `workspaceId`, `projectId?`, `questionKey`, `answerText`, `answerJson?`, timestamps.  
  - Relaties: `workspace: Workspace`, `project: Project?`.  
  - Uniek: `@@unique([workspaceId, projectId, questionKey])`.

- `ProfileState`  
  - State tracking voor profile building (welke vragen zijn beantwoord, welke missen).  
  - Velden: `id`, `workspaceId`, `projectId?`, `knownKeys` (JSON), `missingKeys` (JSON), `confidenceScore`, `lastQuestionKey?`, timestamps.  
  - Relaties: `workspace: Workspace`, `project: Project?`.  
  - Uniek: `@@unique([workspaceId, projectId])`.

- `ProfileCard`  
  - Gesynthetiseerde profile card (voiceCard, audienceCard, offerCard, constraints).  
  - Velden: `id`, `workspaceId`, `projectId?`, `version`, `voiceCard` (JSON), `audienceCard` (JSON), `offerCard` (JSON), `constraints` (JSON), timestamps.  
  - Relaties: `workspace: Workspace`, `project: Project?`.  
  - Uniek: `@@unique([workspaceId, projectId, version])`.

### Content Generation

- `Example`  
  - Good/bad examples voor content generation (workspace + optioneel project context).  
  - Velden: `id`, `workspaceId`, `projectId?`, `kind` ('good' | 'bad'), `content`, `notes?`, `createdAt`.  
  - Relaties: `workspace: Workspace`, `project: Project?`.  
  - Indexes: `[workspaceId]`, `[projectId]`, `[workspaceId, kind]`.

- `Output`  
  - Generated content (LinkedIn posts, blog posts, brainstorm ideeën).  
  - Velden: `id`, `workspaceId`, `projectId?`, `channel` ('linkedin' | 'blog'), `mode` ('thought_to_post' | 'brainstorm' | 'batch_qa' | 'content_bank'), `inputJson` (JSON), `content`, `quality` (JSON), `tokensUsed?`, `costEstimate?`, `promptVersion?`, `modelName?`, `specVersion?`, `profileCardVersion?`, `rewriteCount?`, `failReason?`, `createdAt`.  
  - Relaties: `workspace: Workspace`, `project: Project?`, `feedbacks: Feedback[]`.  
  - Indexes: `[workspaceId]`, `[projectId]`, `[workspaceId, channel, mode, createdAt]`.

- `Feedback`  
  - User feedback op generated outputs.  
  - Velden: `id`, `outputId`, `rating`, `notes?`, `createdAt`.  
  - Relatie: `output: Output`.  
  - Index: `[outputId]`.

### Library

- `Prompt`  
  - Organization-wide prompt templates.  
  - Velden: `id`, `organizationId`, `title`, `body`, `tags` (comma-separated), timestamps.  
  - Relatie: `organization: Organization`.  
  - Index: `[organizationId]`.

---

## 6) External integrations

### OpenAI / LLM

- Config: `lib/openai.ts`
  - Env:
    - `OPENAI_API_KEY` (verplicht)
    - `OPENAI_MODEL` (optioneel, default `"gpt-4.1-mini"`)
  - Exports:
    - `openai` client (v4 SDK).
    - `OPENAI_MODEL` string.

- Helper: `lib/ai.ts`
  - `generateText({ system, user, extraSystem, temperature })`  
    - Bouwt `messages` lijst met één of meerdere `system` messages plus de `user` message.  
    - Roept `openai.chat.completions.create({ model: OPENAI_MODEL, messages, temperature })`.  
    - Retourneert eerste `message.content` als string.

- Gebruik in het platform:
  - `app/api/chat/route.ts`
    - Gebruikt `generateText` om Data Hub antwoorden te verrijken met natuurlijke taal op basis van metrics + insights JSON context.
  - `app/api/internal/openai-ping/route.ts`
    - Health-check endpoint dat OpenAI-call uitvoert (assumption).
  - Document RAG (`app/api/documents/ask/route.ts`) gebruikt op dit moment alleen `buildDocumentRagPrompt`, niet direct `generateText` (placeholder implementatie; makkelijk uit te breiden).

### Intel Service (FastAPI)

- **OAuth & Data Sync**:
  - `services/intel/app/routers/oauth_ga4.py`  
    - `/oauth/ga4/authorize` - Start GA4 OAuth flow.
    - `/oauth/ga4/callback` - OAuth callback, slaat tokens op in `Connection.authJson` (encrypted).
  - `services/intel/app/providers/ga4_sync.py`  
    - `sync_ga4_daily()` - Sync GA4 metrics naar `Signal` tabel (v2) en `MetricDaily` (backward compatibility).
    - Mapt GA4 metrics (`sessions`, `totalUsers`, `screenPageViews`, `conversions`, `totalRevenue`) naar `Signal` types.
  - `services/intel/app/routers/providers.py`  
    - `/providers/status` - Haalt connection status, last sync time, en last error op per provider.
  - `services/intel/app/routers/internal.py`  
    - `/internal/cron/sync-daily` - Daily sync cron job (beveiligd met `CRON_SECRET`).
    - `/internal/cron/weekly-report` - Weekly report generation cron job.

- **Intelligence Generation**:
  - `services/intel/app/routers/intelligence.py`  
    - `/intelligence/generate` - Genereert `InsightV2` entries via LLM op basis van `Signal` data.
    - Selecteert relevante signals, bouwt prompt, en genereert observations, hypotheses, en opportunities.
  - `services/intel/app/weekly_report.py`  
    - `generate_weekly_report_for_workspace()` - Genereert `WeeklyReportV2` met scoreboard, summary, decisions, en risks.

- **Configuratie**:
  - Environment variables: `INTEL_API_KEY`, `CRON_SECRET`, `DATABASE_URL`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXTJS_BASE_URL`, `OPENAI_API_KEY`.

### Agent Runtime Service (FastAPI)

- `services/agent-runtime/`  
  - FastAPI service voor agent execution.
  - Endpoints: `/api/run`, `/api/callback`, `/api/verify`.
  - Gebruikt Prisma voor database access.

### n8n / externe agent runner

- `app/api/agents/run/route.ts`
  - Stuurt `runId` + `userAgentId` naar `N8N_RUN_WEBHOOK_URL` (POST JSON).  
  - Geen retries, enkel één fire-and-forget call met fallback-markering in `RunLog` bij fout.

- `app/api/internal/run-context/route.ts`
  - Toegankelijk voor een externe service (bijv. n8n-flow of Python worker) met header `X-AGENT-SERVICE-KEY`.  
  - Biedt genoeg info om een agent-run uit te voeren op basis van `UserAgent` + `AgentTemplate` + `config`.

### Overig

- Opslag van bestanden (assumption):
  - `Document.fileUrl` wijst naar een externe storage (bv. S3, Supabase Storage of andere). Concrete integratie is in deze repo niet aanwezig; slechts URL opslag.  

---

## Einde: platform-scan samenvatting

- De app is een SaaS-achtig platform met:
  - **Auth**: NextAuth Credentials.
  - **Multi-tenancy**: 
    - Per user via `Workspace` en `WorkspaceContext`.
    - Per organization via `Organization` en `Membership` (multi-user teams).
    - Per project binnen organization (optioneel workspace context).
  - **Data Hub v1**: Connecties, metrics, insights, chat bovenop `Connection`, `MetricDaily`, `Insight`, `ChatMessage` (nu workspace-aware).
  - **Data Hub v2**: Unified Signals layer (`Signal`), LLM-generated insights (`InsightV2`), content drafts (`ContentDraftV2`), weekly reports (`WeeklyReportV2`).
  - **Intel Service**: FastAPI service voor OAuth (GA4), daily sync, intelligence generation, en weekly reports.
  - **Bureau-AI Content Generation**: Profile system (`ProfileAnswer`, `ProfileState`, `ProfileCard`), content generation (`Output`), examples en feedback.
  - **Projects**: Organization-wide project management met project-specifieke chats, documenten, en content.
  - **Agents-laag**: `AgentTemplate`, `UserAgent`, `RunLog` met webhook-gebaseerde uitvoer (n8n of andere service).
  - **Document RAG**: Documenten + Chunks + Prompt-builder (klaar voor LLM integratie).
  - **Prompt Library**: Organization-wide prompt templates.


