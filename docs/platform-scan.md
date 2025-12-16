## 1) Runtime overview

- **Framework**: Next.js App Router (TypeScript)
  - `app/` met segmenten `(auth)` voor login/register en `(app)` voor ingelogde app-routes.
  - Server Components voor data fetching (`getServerSession`, Prisma) en Client Components voor interactieve UI.
- **Runtime / hosting** (assumption):
  - Wordt gebouwd als Node-server (geen `next export`), met dynamische rendering geforceerd waar nodig (`export const dynamic = "force-dynamic"` op verschillende API-routes en data-pagina's).
  - In README staan instructies voor deploy op Render als web service.
- **Database & ORM**: Prisma + PostgreSQL
  - Prisma schema: `prisma/schema.prisma` met modellen `User`, `AgentTemplate`, `UserAgent`, `RunLog`, `Connection`, `MetricDaily`, `Insight`, `ChatMessage`, `Workspace`, `WorkspaceContext`, `Document`, `DocumentChunk`.
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
  - Kanaal-detailpagina per provider (`GOOGLE_ADS`, `META_ADS`, `LINKEDIN`, `WEBSITE`, `EMAIL`, `SUPPORT`).  
  - Mapt slug naar provider (helper `slugToProvider`) en gebruikt `/api/data/channel` om detaildata te halen (assumption: via client fetch of server data fetch).  

- `app/(app)/onboarding/page.tsx`  
  - Multi-step onboarding wizard (4 stappen) om user/bedrijf-context in te vullen.  
  - Stuurt bij submit een `PATCH` request naar `/api/context` met `profileJson`, `goalsJson`, `preferencesJson`.  
  - Na succesvol opslaan → `router.push("/dashboard")`.

- `app/(app)/workflows/page.tsx`  
  - Placeholder “Workflows” pagina (titel + korte tekst).

- `app/(app)/library/page.tsx`  
  - Placeholder “Library” pagina (content niet uitgelezen, maar basic info). (assumption: enkel statische uitleg/resource overview.)

- `app/(app)/support/page.tsx`  
  - Placeholder “Support” pagina (contact info / uitleg). (assumption.)

- `app/(app)/account/page.tsx`  
  - Account-pagina voor user-profiel / settings (inhoud niet volledig bekeken, assumption: basisprofiel en eventueel workspace info).

Navigatie:
- `components/Navigation.tsx`  
  - `navigationItems`:
    - `/dashboard`, `/data`, `/agents`, `/workflows`, `/library`, `/support`, `/account`.
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

### Overig

- `app/api/data/channel/route.ts` en `app/api/data/overview/route.ts` zijn hierboven al beschreven.
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

Deze routes eisen een ingelogde user en gebruiken daarna `getCurrentUser()` voor userId.

**Workspace-isolatie**

- `lib/workspace.ts`  
  - `getOrCreateWorkspace(userId)` garandeert exact één (eerste) workspace per user.  

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

- API-routes met user-isolatie via userId (zonder expliciet workspace):
  - Data Hub: `Connection`, `MetricDaily`, `Insight`, `ChatMessage`, `UserAgent`, `RunLog` → altijd gefilterd op `userId = currentUser.id` of via relaties (`userAgent.userId = currentUser.id`).

Conclusie:  
- Auth is gecentraliseerd in `lib/auth-helpers.ts` en enforced in vrijwel alle API-routes met user-data.  
- Workspace-isolatie is duidelijk voor document- en context-gerelateerde flows; agents en data-hub flows zijn user-geïsoleerd (1 workspace per user, assumption).

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

### Agents & runs

- `AgentTemplate`  
  - Blueprint voor een agent/workflow.  
  - Velden: `name`, `slug`, `category`, `shortDescription`, `longDescription`, `type` ("agent" of "workflow"), `difficulty`, `videoUrl?`, `configSchema` (JSON-as-string).
  - Relaties: `userAgents: UserAgent[]`.

- `UserAgent`  
  - Concrete geactiveerde agent per user.  
  - Velden: `userId`, `agentTemplateId`, `name`, `config` (JSON-as-string), `status` ("active"/"inactive"/"incomplete").  
  - Relaties: `user: User`, `agentTemplate: AgentTemplate`, `runLogs: RunLog[]`.

- `RunLog`  
  - Log van agent-executies.  
  - Velden: `userAgentId`, `status` ("queued" | "running" | "success" | "failed"), `summary?`, `resultUrl?`, `error?`, `metadata?` (JSON-as-string).  
  - Relatie: `userAgent: UserAgent`.

### Data Hub

- `Connection`  
  - Per user+provider connectiestatus.  
  - Velden: `userId`, `provider`, `status`, `authJson?`.  
  - Relatie: `user: User`.  
  - Uniek: `@@unique([userId, provider])`.

- `MetricDaily`  
  - Dagelijkse metrics snapshot per user+provider.  
  - Velden: `userId`, `provider`, `date`, `metricsJson`, `dimensionsJson?`.  
  - Relatie: `user: User`.

- `Insight`  
  - Inzichten/suggestions per user en optioneel provider.  
  - Velden: `userId`, `provider?`, `title`, `summary`, `severity`, `period?`, `dataRefJson?`.  
  - Relatie: `user: User`.

- `ChatMessage`  
  - Conversatielog voor Master/Data chat.  
  - Velden: `userId`, `scope`, `role`, `content`, `createdAt`.  
  - Relatie: `user: User`.

### Workspace & documenten

- `Workspace`  
  - Multi-tenant container per user.  
  - Velden: `id`, `name`, `ownerId`, timestamps.  
  - Relaties: `owner: User`, `context: WorkspaceContext?`, `documents: Document[]`, `chunks: DocumentChunk[]`.

- `WorkspaceContext`  
  - Lichte profiel-/doelen-/voorkeuren-context voor AI/RAG.  
  - Velden: `workspaceId @unique`, `profileJson`, `goalsJson`, `preferencesJson`, timestamps.  
  - Relatie: `workspace: Workspace`.

- `Document`  
  - Document-per-workspace entry.  
  - Velden: `workspaceId`, `title`, `fileUrl`, `status` (bv. `"pending"`, `"ready"`).  
  - Relaties: `workspace: Workspace`, `chunks: DocumentChunk[]`.

- `DocumentChunk`  
  - Tekstchunks van een document.  
  - Velden: `documentId`, `workspaceId`, `chunkIndex`, `text`, `embedding?`, `createdAt`.  
  - Relaties: `document: Document`, `workspace: Workspace`.  
  - Uniek: `@@unique([documentId, chunkIndex])`.

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
  - Auth via NextAuth Credentials.
  - Multi-tenant per user via `Workspace` en `WorkspaceContext`.
  - Data Hub (connecties, metrics, insights, chat) bovenop `Connection`, `MetricDaily`, `Insight`, `ChatMessage`.
  - Agents-laag (`AgentTemplate`, `UserAgent`, `RunLog`) met een webhook-gebaseerde uitvoer (n8n of andere service).
  - Document RAG-basis (Documenten + Chunks + Prompt-builder) met een nog deterministisch antwoord (klaar voor LLM integratie).


