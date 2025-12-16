## Agents & Agent-like Features Inventory

> Alle informatie hieronder is gebaseerd op de huidige code; waar iets niet 100% duidelijk is, staat **(assumption)** erbij.

---

### 1) AgentTemplates Catalog (Blueprint agents)

- **Name**: AgentTemplates Catalogus (meerdere concrete agent types)
- **UI entry point**
  - Pagina: `app/(app)/agents/page.tsx`
  - Detailpagina: `app/(app)/agents/[slug]/page.tsx`
  - Componenten:
    - `components/AgentsCatalog.tsx`
    - `components/AgentDetail.tsx`
    - `components/AgentConfigForm.tsx`
- **API routes**
  - Lezen templates: direct via Prisma in server components (geen aparte API route).
  - Activeren: `POST /api/agents/activate` → `app/api/agents/activate/route.ts`
  - Runnen: `POST /api/agents/run` → `app/api/agents/run/route.ts`
  - Run-context (voor externe runner): `GET /api/internal/run-context?userAgentId=...` → `app/api/internal/run-context/route.ts`
- **LLM usage**
  - Direct: geen (AgentTemplates zelf gebruiken geen `generateText`).  
  - Indirect: een externe runner (n8n / Python) zou binnen zijn flow OpenAI kunnen gebruiken, maar dat staat buiten deze repo. **(assumption)**
- **Data dependencies**
  - `AgentTemplate`
  - `UserAgent`
  - `RunLog`
  - `User`
- **Status**: **WORKS**  
  - Aanmaken van `UserAgent` via UI + API werkt end-to-end.
  - Starten van een `RunLog` en webhook-call naar `N8N_RUN_WEBHOOK_URL` werkt end-to-end (externe runner moet zelf gebouwd/geconfigureerd zijn).
- **Recommendation**: **KEEP**
  - Dit is de kern van het “Agents”-concept in de app en vormt een goede basis om later Python-based executors aan te koppelen.
- **Notes on migrating execution to Python**
  - Python-service kan:
    - Luisteren op een webhook die door `app/api/agents/run/route.ts` wordt aangeroepen (`N8N_RUN_WEBHOOK_URL` → vervang of routeer naar Python backend).
    - Voor elke run:
      1. `GET /api/internal/run-context?userAgentId=...` aanroepen om `AgentTemplate` + `config` op te halen.
      2. Eventuele extra context ophalen uit andere API’s of DB.
      3. LLM-calls in Python doen (bijv. OpenAI, Anthropic) en business logic uitvoeren.
      4. Optioneel een `runs/callback`-achtige endpoint aanroepen (in deze repo aanwezig als `app/api/runs/callback/route.ts`, shape checken bij implementatie) om `RunLog.status`, `summary`, `resultUrl` en `metadata` bij te werken.
  - Database blijft de “source of truth”; Python is puur executielaag.

---

### 2) Data Hub Master Chat (Cross-channel insights)

- **Name**: Data Hub Master Chat
- **UI entry point**
  - Pagina: `app/(app)/data/page.tsx` (Data Hub)
  - Component: `components/DataHubContent.tsx`  
    - Gebruikt `components/MasterChat.tsx` (zonder Copilot-modus; alleen MASTER scope).
- **API routes**
  - Chat: `POST /api/chat` (`app/api/chat/route.ts`)
    - Body: `{ scope: "MASTER", message: string }`
  - Data backend (waar de chat zijn context uit haalt):
    - `GET /api/data/overview` (`app/api/data/overview/route.ts`) – wordt niet direct door de chat aangeroepen, maar is logisch verwant (zelfde brondata). **(assumption)**
- **LLM usage**
  - Ja, via `generateText`:
    - System prompt: `"Je bent de AgentHub Data Hub assistent..."`
    - `extraSystem`: JSON-context met KPIs + insights over meerdere providers.
  - Flow in `app/api/chat/route.ts` voor `scope === "MASTER"`:
    1. Haalt `MetricDaily` en `Insight` data voor `GOOGLE_ADS`, `META_ADS`, `LINKEDIN` uit Prisma.
    2. Bouwt deterministisch fallback-antwoord (metrics + insights).
    3. Probeert AI-verrijking via `generateText` met JSON-context; gebruikt AI-antwoord als het er is, anders fallback.
- **Data dependencies**
  - `MetricDaily` (dagelijkse metrics per provider)
  - `Insight` (laatste inzichten per provider)
  - `ChatMessage` (log van USER/ASSISTANT berichten per scope)
  - `User`
- **Status**: **WORKS**
  - Laatste versie doet consistente input-validatie, schrijft `ChatMessage`s, en gebruikt OpenAI-API via `generateText`.
- **Recommendation**: **KEEP** (eventueel **REFACTOR** later)
  - KEEP als feature; het is een nette gateway rond bestaande data.
  - REFRACTOR (later) om:
    - Context-bouw en promptconstructie naar een aparte helper te verplaatsen.
    - Eventueel streaming/partial responses toe te voegen.
- **Notes on migrating execution to Python**
  - Mogelijke architectuur:
    - Houd `/api/chat` als dunne façade die de request direct doorstuurt naar een Python-service (HTTP call) met `{ userId, scope, message }`.
    - Python doet:
      - DB-read via een interne service of een dedicated REST endpoint (bv. `/api/data/overview` of nieuwe “raw data” endpoints).
      - LLM-calls met eigen prompt-engine.
      - Retourneert `{ reply, debugContext? }` naar Next.js, dat dit opslaat in `ChatMessage` en terugstuurt.
  - Alternatief: Next.js API blijft metrics ophalen; Python-service wordt alleen LLM-orchestrator die een prompt + context ontvangt en antwoordt.

---

### 3) Data Hub Channel Chat (per provider)

- **Name**: Kanaal Chat (provider-specifiek)
- **UI entry point**
  - Pagina: `app/(app)/data/[provider]/page.tsx` (channel detail)
  - Componenten:
    - `components/ChannelDetailContent.tsx`
    - Mogelijk een gespecialiseerde chat UI per kanaal of hergebruik van `MasterChat` met andere scope. **(assumption, exacte UI-implementatie niet volledig gescand)**
- **API routes**
  - Chat: `POST /api/chat` (`app/api/chat/route.ts`) met `scope` gelijk aan de provider (`"GOOGLE_ADS"`, `"META_ADS"`, `"LINKEDIN"`, `"WEBSITE"`, `"EMAIL"`, `"SUPPORT"`).
  - Data: `GET /api/data/channel?provider=...` voor detail-data in de UI; chat hergebruikt dezelfde onderliggende tabellen, maar direct via Prisma in de chat-API.
- **LLM usage**
  - Ja, via `generateText` (zelfde API als Master chat).
  - Per provider-scope:
    - System prompt: `"Je bent de AgentHub Data Hub assistent voor het kanaal ${scope}..."`
    - `extraSystem`: JSON-context met `latestMetricJson` en lijst van `insights` (severity, timestamps, etc.).
- **Data dependencies**
  - `MetricDaily`
  - `Insight`
  - `ChatMessage`
  - `User`
- **Status**: **WORKS**
  - Zelfde implementatiepad als MASTER-scope, alleen met kanaalfiltering.
- **Recommendation**: **KEEP**
  - Samen met Master Chat vormt dit één coherent chat-systeem rond marketing/data-kanalen.
- **Notes on migrating execution to Python**
  - Zelfde strategie als bij Master Chat:
    - Scope en message naar Python sturen met userId.
    - Python haalt metrics/insights via dedicated endpoints of direct DB access.
    - Python doet LLM-call en stuurt antwoord terug.
  - Chat-logging (`ChatMessage`) kan in Next.js blijven of ook verplaatst worden naar een Python layer die een logging endpoint aanroept.

---

### 4) Document Q&A / RAG Assistant

- **Name**: Document Q&A / RAG Prompt Builder
- **UI entry point**
  - Document upload/verwerking UI staat vermoedelijk bij een “Library” of “Documents” sectie (componenten zijn niet expliciet gelinkt in de scan). **(assumption)**  
  - Wat duidelijk is: de API’s zijn aanwezig en volledig, maar de exacte UI-entrypoint(en) in `app/(app)` zijn nog minimaal of achter een eenvoudige pagina verstopt.
- **API routes**
  - `POST /api/documents/upload` → upload registreren (`Document` met `fileUrl`).
  - `POST /api/documents/process` → tekst in `DocumentChunk`s hakken.
  - `POST /api/documents/ask` → prompt + deterministisch antwoord genereren.
- **LLM usage**
  - Direct: nog niet; `ask`-route bouwt alleen de prompt via `buildDocumentRagPrompt` en geeft een deterministische `simulatedAnswer` per mode.
  - `buildDocumentRagPrompt`:
    - Gebruikt `WorkspaceContext` (`profileJson`, `goalsJson`, `preferencesJson`) om user-rol, branche en doelen in prompt te verwerken.
    - Beschrijft documentfragmenten (`DocumentChunk`) en vraagt een samenvatting/plan/checklist/QA in NL.
- **Data dependencies**
  - `Workspace`
  - `WorkspaceContext`
  - `Document`
  - `DocumentChunk`
  - `User`
- **Status**: **PARTIALLY WORKING**
  - Pipelines voor upload, chunking en prompt-generatie werken.
  - LLM-call voor daadwerkelijke Q&A ontbreekt nog; er is alleen een placeholder antwoord.
- **Recommendation**: **REFACTOR**
  - Korte termijn:
    - Voeg in `app/api/documents/ask/route.ts` een echte `generateText`-call toe met de gegenereerde prompt (of verplaats naar Python).
    - Beperk gebruike prompt-lengte (chunks trunceren, max tokens) voor kosten/prestaties.
  - Lange termijn:
    - Prompt-builder en retrieval in aparte module(s) onderbrengen voor hergebruik (ook door Python-service).
- **Notes on migrating execution to Python**
  - Python kan:
    - Een endpoint (of message queue) ontvangen met `{ workspaceId, question, documentId?, mode }`.
    - Via intra-service API of direct DB access:
      - `WorkspaceContext` + relevante `DocumentChunk`s ophalen.
      - Prompt genereren (code in `buildDocumentRagPrompt` herschrijven in Python).
    - Een LLM-call doen en het antwoord direct teruggeven aan Next.js of opslaan in een `DocumentAnswer`-achtige tabel (later toe te voegen).
  - Next.js `ask`-route kan dan reduceren tot: validatie + doorsturen naar Python + antwoord teruggeven.

---

### 5) Workspace Context & Onboarding Assistant (meta-agent)

- **Name**: Workspace Context Onboarding
- **UI entry point**
  - Pagina: `app/(app)/onboarding/page.tsx`
  - Vorm: multi-step formulier dat user- en bedrijfscontext ophaalt (rol, branche, teamgrootte, werkstijl, tools, doelen, frustraties, AI-verwachtingen, gewenste agents, etc.).
- **API routes**
  - `PATCH /api/context` → `app/api/context/route.ts`  
    - Slaat `profileJson`, `goalsJson`, `preferencesJson` op in `WorkspaceContext`.
  - `GET /api/context` wordt gebruikt om bestaande context op te halen (o.a. voor onboarding en eerdere Copilot-implementaties; nu vooral voor onboarding en RAG).  
- **LLM usage**
  - Indirect: context wordt gebruikt in `buildDocumentRagPrompt` en kan later ook in chat/agents worden gebruikt.
  - Direct: geen eigen `generateText`-aanroepen.
- **Data dependencies**
  - `Workspace`
  - `WorkspaceContext`
  - `User`
- **Status**: **WORKS**
  - Onboarding slaat context netjes op en dashboard redirect op basis van aanwezigheid van context.
- **Recommendation**: **KEEP**
  - Dit is een waardevolle bron van user-intent/context voor alle agents/LLMs.
- **Notes on migrating execution to Python**
  - Python-services kunnen:
    - `GET /api/context` gebruiken om rijke user-context in prompts te bouwen.
    - Context combineren met agent-config (`UserAgent.config`) en data (`MetricDaily`, `Insight`, `DocumentChunk`) voor gepersonaliseerde acties.

---

## Status Summary Table

| Feature                                     | Status             | Recommendation |
|---------------------------------------------|--------------------|----------------|
| AgentTemplates Catalog + UserAgents + Runs  | WORKS              | KEEP           |
| Data Hub Master Chat                        | WORKS              | KEEP / REFACTOR (later) |
| Data Hub Channel Chat (per provider)        | WORKS              | KEEP           |
| Document Q&A / RAG                          | PARTIALLY WORKING  | REFACTOR       |
| Workspace Context & Onboarding              | WORKS              | KEEP           |

---

## Top 10 Cleanup List (Next Steps)

> Let op: dit is een **suggestie**; voer alleen uit als het past bij je roadmap.

1. **Consolideer Data Hub metrics/insights access**  
   - **Refactor**:  
     - Maak een helper in bv. `lib/dataHub.ts` die gedeelde logic uit `/api/data/overview`, `/api/data/channel` en `/api/chat` (MASTER/provider) bevat.  
   - **Bestanden**:  
     - `app/api/data/overview/route.ts`  
     - `app/api/data/channel/route.ts`  
     - `app/api/chat/route.ts`

2. **Voeg echte LLM-antwoordlogica toe aan Document Q&A**  
   - **Refactor**:  
     - In `app/api/documents/ask/route.ts` na `buildDocumentRagPrompt` een `generateText`-call toevoegen en `answer` baseren op LLM i.p.v. placeholder.  
   - **Bestand**:  
     - `app/api/documents/ask/route.ts`

3. **Introduceer een dedicated Python-execution endpoint voor agent runs**  
   - **Refactor** (backend contract):  
     - Definieer in `app/api/runs/callback/route.ts` een duidelijk schema voor statusupdates vanuit Python/n8n.  
   - **Bestanden**:  
     - `app/api/agents/run/route.ts`  
     - `app/api/internal/run-context/route.ts`  
     - `app/api/runs/callback/route.ts`

4. **Documenteer het run-contract voor externe services**  
   - **Refactor (docs)**:  
     - Maak een technische spec in `docs/agents-run-contract.md` **(nieuw bestand)** met request/response voor:
       - `POST /api/agents/run`
       - `GET /api/internal/run-context`
       - `POST /api/runs/callback`

5. **Schoon placeholder teksten in Document Q&A op**  
   - **Refactor**:  
     - Herformuleer placeholders in `simulatedAnswer` om duidelijk te maken dat het een “dummy” is totdat LLM-integratie live is.  
   - **Bestand**:  
     - `app/api/documents/ask/route.ts`

6. **Centraliseer workspace-access patterns**  
   - **Refactor**:  
     - Maak helpers voor “workspace + workspaceContext ophalen” zodat code in `dashboard`, `context`, `documents/*` minder duplicatie heeft.  
   - **Bestanden**:  
     - `lib/workspace.ts`  
     - `app/(app)/dashboard/page.tsx`  
     - `app/api/context/route.ts`  
     - `app/api/documents/*`

7. **Formaliseren ChatMessage scopes in type of enum helper**  
   - **Refactor**:  
     - Introduceer een TS-type `ChatScope = "MASTER" | ...` in bv. `types/chat.ts` en gebruik dat in `/api/chat` en in de frontend.  
   - **Bestanden**:  
     - `app/api/chat/route.ts`  
     - `components/MasterChat.tsx`

8. **UI voor Document Q&A afmaken en koppelen**  
   - **Refactor/Feature**:  
     - Maak expliciete UI in de app (bijv. onder `/library` of een nieuwe `/documents` route) die:
       - Upload → `/api/documents/upload`
       - Verwerken → `/api/documents/process`
       - Vragen → `/api/documents/ask`  
   - **Bestanden (te maken/te koppelen)**:  
     - `app/(app)/library/page.tsx` of nieuwe `app/(app)/documents/*`

9. **Logging & monitoring voor agent runs verbeteren**  
   - **Refactor**:  
     - Voeg structured logging toe in `agents/run` en `internal/run-context` en zorg dat errors consistent in `RunLog` worden geüpdatet.  
   - **Bestanden**:  
     - `app/api/agents/run/route.ts`  
     - `app/api/internal/run-context/route.ts`

10. **Opschonen/verduidelijken van commentaar rond Copilot (nu verwijderd)**  
   - **Refactor (docs)**:  
     - Controleer README en docs op oude “Copilot” verwijzingen; zorg dat alles generiek “AI-assistent”/“Data Hub assistent” heet (grotendeels al gedaan, maar dubbelcheck gewenst).  
   - **Bestanden**:  
     - `README.md`  
     - eventuele extra docs in `docs/` (als later toegevoegd).

---

## Slotopmerking

De huidige codebase heeft een duidelijke scheiding tussen:
- UI (Next.js pages + React components),
- data/API (Prisma-gestuurde routes),
- en AI/LLM-integraties (OpenAI wrapper + prompt-builders).

Dat maakt het relatief eenvoudig om later Python-gebaseerde executors toe te voegen die via heldere HTTP-contracten met deze Next.js-app praten, zonder grote schema-wijzigingen nodig te hebben.


