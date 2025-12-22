# Bureau-AI Platform - Complete Platform Documentatie voor Gemini

## Overzicht

**Bureau-AI** is een geïntegreerd SaaS-platform voor MKB-bedrijven dat drie kernfunctionaliteiten combineert in één geünificeerde omgeving:

1. **Data Hub** - Gecentraliseerd marketing data dashboard
2. **AI Agents & Workflows** - Automatisering van bedrijfsprocessen
3. **Bureau-AI Content Engine** - Gepersonaliseerde content generatie op basis van bedrijfsprofiel

Het platform is opgebouwd als een moderne, multi-tenant SaaS-architectuur met een monorepo-structuur die zowel frontend (Next.js) als backend services (FastAPI/Python) bevat.

---

## Platform Architectuur

### Hoog-niveau Structuur

Het platform bestaat uit:

```
┌─────────────────────────────────────────────────────────┐
│              Next.js 14 Frontend Application            │
│  (React Server Components + Client Components)          │
│  - Authentication (NextAuth.js)                         │
│  - Data Hub UI                                          │
│  - Agents Catalog & Management                          │
│  - Bureau-AI Content Generation                         │
│  - Dashboard & Analytics                                │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
┌────────▼─────────┐ ┌────────▼─────────┐
│  Intel Service   │ │ Agent Runtime    │
│  (FastAPI/Python)│ │ (FastAPI/Python) │
│                  │ │                  │
│ - OAuth flows    │ │ - Agent execution│
│ - Data sync      │ │ - OpenAI/RAG     │
│ - GA4 API        │ │ - Document RAG   │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         └────────┬───────────┘
                  │
         ┌────────▼─────────┐
         │  Supabase        │
         │  PostgreSQL      │
         │  (via Prisma ORM)│
         └──────────────────┘
```

### Monorepo Directory Structuur

```
/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Publieke authenticatie routes
│   │   ├── layout.tsx
│   │   └── login/                # Login pagina
│   │   └── register/             # Registratie pagina
│   │
│   ├── (app)/                    # Beveiligde applicatie routes
│   │   ├── layout.tsx            # Hoofdlayout met navigatie
│   │   ├── dashboard/            # Dashboard overzicht
│   │   ├── agents/               # Agents catalogus & details
│   │   │   ├── page.tsx          # Overzicht alle agents
│   │   │   └── [slug]/           # Agent detail pagina
│   │   ├── workflows/            # Workflows overzicht
│   │   ├── data/                 # Data Hub
│   │   │   ├── page.tsx          # Data Hub dashboard
│   │   │   └── [provider]/       # Provider-specifieke views
│   │   ├── bureau-ai/            # Content generatie engine
│   │   │   └── page.tsx          # Main Bureau-AI interface
│   │   ├── library/              # Prompt library
│   │   ├── projects/             # Project management
│   │   ├── prompt-library/       # Prompt templates
│   │   ├── prompts/              # Prompt management
│   │   ├── support/              # Support pagina
│   │   └── account/              # Account instellingen
│   │       └── personalization/  # Profiel wizard
│   │
│   └── api/                      # Next.js API Routes
│       ├── auth/                 # NextAuth endpoints
│       │   ├── [...nextauth]/    # NextAuth handler
│       │   └── register/         # User registratie
│       ├── agents/               # Agents API
│       │   ├── activate/         # Agent activatie
│       │   └── run/              # Agent execution trigger
│       ├── data/                 # Data Hub API
│       │   ├── connections/      # Connection management
│       │   ├── metrics/          # Metrics retrieval
│       │   └── insights/         # Insights retrieval
│       ├── chat/                 # AI chat voor Data Hub
│       ├── generate/             # Content generatie API
│       │   ├── linkedin/         # LinkedIn post generatie
│       │   ├── blog/             # Blog post generatie
│       │   └── brainstorm/       # Brainstorm ideeën
│       ├── profile/              # Profiel management
│       │   ├── answers/          # ProfileAnswer CRUD
│       │   ├── cards/            # ProfileCard beheer
│       │   └── synthesize/       # Profiel synthese
│       ├── thought/              # Interview systeem
│       │   └── interview/        # Verdienstingsvragen
│       ├── outputs/              # Output management
│       ├── documents/            # Document RAG
│       └── internal/             # Interne endpoints
│
├── components/                   # React Components
│   ├── ui/                       # Design system components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── bureauai/                 # Bureau-AI specifieke components
│   │   ├── AppShell.tsx
│   │   └── OutputFeedback.tsx
│   ├── AgentsCatalog.tsx         # Agents overzicht
│   ├── AgentDetail.tsx           # Agent detail view
│   ├── DashboardContent.tsx      # Dashboard inhoud
│   ├── DataHubContent.tsx        # Data Hub interface
│   ├── MasterChat.tsx            # Chat interface
│   └── Navigation.tsx            # Hoofdnavigatie
│
├── lib/                          # Shared Libraries
│   ├── prisma.ts                 # Prisma client instance
│   ├── auth.ts                   # NextAuth configuratie
│   ├── openai.ts                 # OpenAI client setup
│   ├── ai.ts                     # AI utility functies
│   ├── workspace.ts              # Workspace helpers
│   ├── organization.ts           # Organization helpers
│   │
│   └── bureauai/                 # Bureau-AI core logic
│       ├── repo.ts               # Database operaties
│       ├── effectiveProfile.ts   # Profiel resolutie
│       ├── tenancy.ts            # Multi-tenancy helpers
│       ├── client.ts             # Bureau-AI API client
│       ├── foundations.ts        # Foundations vragen
│       ├── questions.ts          # Vragen logica
│       ├── engine/               # Content engine
│       │   └── generator.ts
│       ├── prompts/              # LLM prompts
│       │   ├── profileSynthPrompt.ts    # Profiel synthese
│       │   ├── linkedinGeneratorPrompt.ts
│       │   ├── blogGeneratorPrompt.ts
│       │   ├── interviewPrompt.ts       # Interview vragen
│       │   ├── brainstormPrompt.ts
│       │   └── qualityPrompt.ts         # Quality gate
│       └── quality/              # Quality evaluatie
│           ├── evaluator.ts
│           └── gate.ts
│
├── prisma/                       # Database Schema & Migrations
│   ├── schema.prisma             # Volledige database schema
│   ├── migrations/               # Database migraties
│   └── seed.ts                   # Seed data script
│
├── services/                     # Backend Microservices
│   ├── intel/                    # Intel Service (FastAPI)
│   │   ├── app/
│   │   │   ├── main.py           # FastAPI app
│   │   │   ├── config.py         # Configuratie
│   │   │   ├── db.py             # Database connectie
│   │   │   ├── crypto.py         # Token encryptie (AES-256-GCM)
│   │   │   ├── routers/
│   │   │   │   ├── health.py     # Health checks
│   │   │   │   ├── oauth_ga4.py  # Google Analytics OAuth
│   │   │   │   ├── providers.py  # Provider management
│   │   │   │   ├── intel.py      # AI analysis endpoints
│   │   │   │   └── internal.py   # Cron endpoints
│   │   │   └── providers/
│   │   │       ├── google_tokens.py
│   │   │       └── ga4_sync.py   # GA4 data synchronisatie
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   └── agent-runtime/            # Agent Runtime Service (FastAPI)
│       ├── app/
│       │   ├── api.py            # API endpoints
│       │   ├── callback.py       # Agent callbacks
│       │   ├── db.py             # Database
│       │   ├── llm.py            # LLM integratie
│       │   ├── models.py         # Data modellen
│       │   └── security.py       # Authenticatie
│       ├── requirements.txt
│       └── main.py
│
├── docs/                         # Documentatie
│   ├── PLATFORM_OVERVIEW.md
│   ├── bureau-ai/                # Bureau-AI specs
│   │   ├── PERSONALIZATION_SPEC.md
│   │   ├── PROFILE_CARDS_SPEC.md
│   │   └── CHANNEL_SPECS.md
│   └── ...
│
└── scripts/                      # Utility scripts
    ├── backfill-datahub-workspace.ts
    ├── check-users.ts
    └── ...
```

---

## Technische Stack & Dependencies

### Frontend Stack

- **Framework**: Next.js 14 (App Router)
  - React Server Components voor server-side rendering
  - Client Components voor interactieve UI
  - Dynamic rendering waar nodig (`export const dynamic = "force-dynamic"`)
  
- **Taal**: TypeScript
  - Volledige type-safety via Prisma generated types
  - Strict type checking

- **Styling**: Tailwind CSS
  - Utility-first CSS framework
  - Custom design system components

- **Authenticatie**: NextAuth.js v4
  - Credentials provider (email/wachtwoord)
  - Session management
  - Protected routes via middleware

- **State Management**: React hooks + Server Components
  - Geen Redux/Zustand nodig door Server Components pattern

### Backend Services

#### Intel Service (FastAPI/Python)

**Doel**: OAuth flows, data synchronisatie, en intelligence analysis

**Dependencies**:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - Database ORM
- `google-auth`, `google-auth-oauthlib` - Google OAuth
- `google-analytics-data` - GA4 Data API
- `cryptography` - Token encryptie (AES-256-GCM)
- `psycopg2` - PostgreSQL driver

**Functionaliteit**:
1. **OAuth Flows**:
   - Google Analytics OAuth flow
   - Token exchange en encryptie
   - Redirect handling

2. **Data Synchronisatie**:
   - Daily cron job voor GA4 metrics sync
   - Idempotent upserts naar `MetricDaily` tabel
   - Error handling en retry logic

3. **Intelligence Analysis**:
   - Chat analysis endpoints
   - Provider status checking
   - Health monitoring

#### Agent Runtime Service (FastAPI/Python)

**Doel**: Agent execution en document RAG

**Dependencies**:
- `fastapi`
- `openai` - OpenAI API client
- `sqlalchemy`
- Document processing libraries

**Functionaliteit**:
1. Agent execution via webhooks
2. OpenAI integratie voor LLM calls
3. Document RAG (Retrieval Augmented Generation)
4. Callback handling voor run status updates

### Database

- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
  - Type-safe database access
  - Migrations management
  - Schema-first approach

- **Multi-tenancy**: Workspace-based isolation
  - Alle data is geïsoleerd per `workspaceId`
  - Row-level filtering in queries

### Infrastructure

- **Hosting**: Render.com
  - Next.js als Web Service
  - Intel Service als separate Web Service
  - Agent Runtime als separate Web Service (optioneel)
  - Render Cron Jobs voor scheduled tasks

- **Storage**: Supabase Storage (voor documenten)
  - File uploads voor Document model
  - Public/private bucket support

- **Environment Management**:
  - `.env` lokaal voor development
  - Render Environment Variables voor productie

---

## Database Schema (Prisma)

### Core Models

#### Authenticatie & Multi-Tenancy

```prisma
model User {
  id            String       @id @default(cuid())
  email         String       @unique
  name          String
  passwordHash  String       // bcrypt hashed
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // Relations
  userAgents    UserAgent[]
  workspaces    Workspace[]  // Owner
  memberships   Membership[] // Organization memberships
  connections   Connection[]
  metricDailies MetricDaily[]
  insights      Insight[]
  chatMessages  ChatMessage[]
}

model Workspace {
  id             String            @id @default(cuid())
  name           String
  ownerId        String
  organizationId String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  
  // Relations
  owner          User              @relation(...)
  organization   Organization?     @relation(...)
  context        WorkspaceContext? // Personalization context
  connections    Connection[]      // Data Hub connections
  metricDailies  MetricDaily[]
  insights       Insight[]
  chatMessages   ChatMessage[]
  documents      Document[]
  profileAnswers ProfileAnswer[]
  profileCards   ProfileCard[]
  outputs        Output[]
}

model Organization {
  id          String       @id @default(cuid())
  name        String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  memberships Membership[]
  workspaces  Workspace[]
  projects    Project[]
  prompts     Prompt[]
}

model Membership {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole      // OWNER, MEMBER, VIEWER
  createdAt      DateTime     @default(now())
  
  organization   Organization @relation(...)
  user           User         @relation(...)
  
  @@unique([organizationId, userId])
}
```

#### Data Hub Models

```prisma
model Connection {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  provider    String   // GOOGLE_ANALYTICS, GOOGLE_ADS, META_ADS, etc.
  status      String   // CONNECTED, PENDING, ERROR, NOT_CONNECTED
  authJson    String?  // Encrypted OAuth tokens (JSON string)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(...)
  workspace   Workspace @relation(...)
  
  @@unique([workspaceId, provider])
}

model MetricDaily {
  id             String   @id @default(cuid())
  userId         String
  workspaceId    String
  provider       String   // GOOGLE_ANALYTICS, etc.
  date           DateTime
  metricsJson    String   // JSON: { impressions, clicks, conversions, etc. }
  dimensionsJson String?  // JSON: optional dimension data
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user           User     @relation(...)
  workspace      Workspace @relation(...)
  
  @@index([workspaceId, provider, date])
}

model Insight {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  provider    String?  // null = master/global insight
  title       String
  summary     String
  severity    String   // INFO, WARNING, CRITICAL
  period      String?
  dataRefJson String?  // JSON reference to relevant data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(...)
  workspace   Workspace @relation(...)
}

model ChatMessage {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  scope       String   // MASTER, GOOGLE_ANALYTICS, META_ADS, etc.
  role        String   // USER, ASSISTANT
  content     String
  createdAt   DateTime @default(now())
  
  user        User     @relation(...)
  workspace   Workspace @relation(...)
}
```

#### Agent Models

```prisma
model AgentTemplate {
  id              String      @id @default(cuid())
  name            String
  slug            String      @unique
  category        String      // Sales, Marketing, Operations
  shortDescription String
  longDescription String
  type            String      // agent, workflow
  difficulty      String      // beginner, advanced
  videoUrl        String?
  configSchema    String      // JSON: form fields definition
  executor        String      @default("n8n")
  n8nWorkflowId   String?
  n8nWebhookPath  String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  userAgents      UserAgent[]
}

model UserAgent {
  id              String      @id @default(cuid())
  userId          String
  agentTemplateId String
  name            String      // User-chosen name
  config          String      // JSON: user configuration
  status          String      // active, inactive, incomplete
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  user            User        @relation(...)
  agentTemplate   AgentTemplate @relation(...)
  runLogs         RunLog[]
}

model RunLog {
  id            String     @id @default(cuid())
  userAgentId  String
  status        String     // queued, running, success, failed
  summary       String?
  resultUrl     String?
  error         String?
  metadata      String?    // JSON
  executor      String     @default("n8n")
  externalRunId String?    // n8n execution ID
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  userAgent     UserAgent  @relation(...)
}
```

#### Bureau-AI Content Models

```prisma
model ProfileAnswer {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?  // Optional project-scoped
  questionKey String   // Stable key (e.g., "voice_identity_short")
  answerText  String
  answerJson  Json?    // Optional structured answer
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  workspace   Workspace @relation(...)
  project     Project?  @relation(...)
  
  @@unique([workspaceId, projectId, questionKey])
}

model ProfileState {
  id               String   @id @default(cuid())
  workspaceId      String
  projectId        String?
  knownKeys        Json?    // Array of answered question keys
  missingKeys      Json?    // Array of missing question keys
  confidenceScore  Float    @default(0)  // 0-1 score
  lastQuestionKey  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  workspace        Workspace @relation(...)
  project          Project?  @relation(...)
  
  @@unique([workspaceId, projectId])
}

model ProfileCard {
  id            String   @id @default(cuid())
  workspaceId   String
  projectId     String?
  version       Int      // Version number for feedback loop
  voiceCard     Json     // VoiceCardV1 structure
  audienceCard  Json     // AudienceCardV1 structure
  offerCard     Json     // OfferCardV1 structure
  constraints   Json     // ConstraintsV1 structure
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  workspace     Workspace @relation(...)
  project       Project?  @relation(...)
  
  @@unique([workspaceId, projectId, version])
}

model Example {
  id          String      @id @default(cuid())
  workspaceId String
  projectId   String?
  kind        ExampleKind // good, bad
  content     String
  notes       String?
  createdAt   DateTime    @default(now())
  
  workspace   Workspace   @relation(...)
  project     Project?    @relation(...)
}

model Output {
  id                 String        @id @default(cuid())
  workspaceId        String
  projectId          String?
  channel            OutputChannel // linkedin, blog
  mode               OutputMode    // thought_to_post, brainstorm, batch_qa, content_bank
  inputJson          Json          // Input parameters
  content            String        // Generated content
  quality            Json?         // Quality metrics
  tokensUsed         Int?
  costEstimate       Float?
  promptVersion      String?
  modelName          String?
  specVersion        String?
  profileCardVersion Int?          // Link to ProfileCard version used
  rewriteCount       Int?          // Number of quality gate rewrites
  failReason         String?
  createdAt          DateTime      @default(now())
  
  workspace          Workspace     @relation(...)
  project            Project?      @relation(...)
  feedbacks          Feedback[]
  
  @@index([workspaceId, channel, mode, createdAt])
}

model Feedback {
  id        String   @id @default(cuid())
  outputId  String
  rating    Int      // 1-5 stars
  notes     String?
  createdAt DateTime @default(now())
  
  output    Output   @relation(...)
}
```

#### Document RAG Models

```prisma
model Document {
  id             String        @id @default(cuid())
  workspaceId    String
  organizationId String?
  scope          DocumentScope @default(PROJECT) // GLOBAL, PROJECT
  projectId      String?
  title          String
  fileUrl        String        // Supabase Storage URL
  status         DocumentStatus // uploaded, processing, ready, failed
  error          String?
  createdAt      DateTime      @default(now())
  
  workspace      Workspace     @relation(...)
  organization   Organization? @relation(...)
  project        Project?      @relation(...)
  chunks         DocumentChunk[]
}

model DocumentChunk {
  id             String        @id @default(cuid())
  documentId     String
  workspaceId    String
  organizationId String?
  scope          DocumentScope @default(PROJECT)
  projectId      String?
  chunkIndex     Int
  text           String
  embedding      String?       // Placeholder voor pgvector
  createdAt      DateTime      @default(now())
  
  document       Document      @relation(...)
  workspace      Workspace     @relation(...)
  organization   Organization? @relation(...)
  project        Project?      @relation(...)
  
  @@unique([documentId, chunkIndex])
}
```

---

## Kernfunctionaliteiten

### 1. Data Hub

**Doel**: Gecentraliseerd dashboard voor alle marketing data

**Features**:
- **OAuth Integraties**:
  - Google Analytics 4 (GA4) - Volledig geïmplementeerd
  - Google Ads - Gepland
  - Meta Ads - Gepland
  - LinkedIn Ads - Gepland

- **Data Synchronisatie**:
  - Daily cron job synchroniseert metrics naar `MetricDaily`
  - Idempotent upsert pattern (geen duplicates)
  - Error handling en retry logic

- **Metrics Dashboard**:
  - Real-time metrics per provider
  - 7-dagen trends
  - Multi-channel vergelijking

- **AI Insights**:
  - Automatisch gegenereerde insights per provider
  - Severity levels: INFO, WARNING, CRITICAL
  - Context-aware aanbevelingen

- **Channel-specifieke Chat**:
  - AI chat per data provider
  - Natuurlijke taal queries op metrics
  - Context-aware antwoorden met OpenAI

**Technische Flow**:

1. **OAuth Flow (GA4)**:
   ```
   User clicks "Verbinden" 
   → Redirect naar Intel Service /oauth/ga4/start
   → Intel Service creates PENDING Connection
   → Redirect naar Google OAuth consent
   → Google callback → /oauth/ga4/callback
   → Intel Service: exchange code voor tokens
   → Encrypt tokens (AES-256-GCM) → store in Connection.authJson
   → Redirect naar Next.js: /data/google-analytics?connected=1
   → User selects GA4 property
   → Connection status → CONNECTED
   ```

2. **Daily Sync**:
   ```
   Render Cron Job (2 AM UTC)
   → POST /internal/cron/sync-daily (met X-Cron-Secret header)
   → Intel Service decrypts tokens
   → Fetch GA4 Data API (metrics voor laatste 7 dagen)
   → Upsert naar MetricDaily (per workspace, provider, date)
   → Store metricsJson + dimensionsJson
   ```

3. **Chat Analysis**:
   ```
   User vraag in Data Hub chat
   → POST /api/chat
   → Fetch recente metrics + insights (JSON)
   → Build prompt met context
   → OpenAI generateText (GPT-4)
   → Return natuurlijk antwoord
   ```

### 2. AI Agents & Workflows

**Doel**: Automatisering van repetitieve bedrijfsprocessen

**Features**:
- **Agent Templates Catalog**:
  - Pre-built agent templates (Sales, Marketing, Operations)
  - Categorieën en moeilijkheidsgraden
  - Configuratie schema's per template

- **Agent Activatie**:
  - User selecteert template
  - Configureert via dynamisch formulier (op basis van `configSchema`)
  - Activeert agent → creates `UserAgent` record

- **Agent Execution**:
  - Trigger via `/api/agents/run`
  - Webhook naar n8n (of andere executor)
  - Status tracking via `RunLog`
  - Real-time status updates

- **Execution History**:
  - RunLogs met status, summary, errors
  - Dashboard overzicht van recente runs
  - Filtering en sorting

**Technische Flow**:

1. **Agent Activatie**:
   ```
   User browst /agents
   → Selecteert agent template
   → Vult configuratie formulier in
   → POST /api/agents/activate
   → Creates UserAgent record
   → Redirect naar /dashboard
   ```

2. **Agent Run**:
   ```
   User triggers agent run
   → POST /api/agents/run (userAgentId, input)
   → Creates RunLog (status: "queued")
   → POST naar N8N_RUN_WEBHOOK_URL
   → N8N workflow executes
   → Callback naar /api/agent-runtime/callback
   → Updates RunLog (status: "success"/"failed")
   ```

### 3. Bureau-AI Content Engine

**Doel**: Gepersonaliseerde content generatie op basis van bedrijfsprofiel

**Kernconcepten**:

#### ProfileAnswer & ProfileCard System

- **ProfileAnswer**: Fijngranulaire antwoorden op wizard vragen
  - Stabiele `questionKey` (bijv. `voice_identity_short`)
  - Tekst of gestructureerde JSON antwoorden
  - Workspace + optioneel Project scoped

- **ProfileCard**: Gesynthetiseerd profiel in 4 kaarten:
  - **VoiceCard**: Toon, formality, energy, schrijfstijl, do's & don'ts
  - **AudienceCard**: Doelgroepsegmenten, primaire rol, uitdagingen
  - **OfferCard**: Kernaanbod, probleemverhaal, belofte, differentiators
  - **Constraints**: Banned phrases, topics, CTA-stijl, toon-limieten

- **ProfileState**: Tracks welke vragen beantwoord zijn, confidence score

#### Content Generation Modes

1. **Thought to Post** (`thought_to_post`):
   - User input: ruwe gedachte
   - Interview systeem stelt verdienstingsvragen
   - Generator maakt LinkedIn post met profile context

2. **Brainstorm** (`brainstorm`):
   - Genereert 5-10 content ideeën op basis van profiel
   - Optioneel: topic filter
   - Output: array van ideeën (strings)

3. **Batch QA** (`batch_qa`):
   - Bulk generatie van posts
   - Quality gate per post

4. **Content Bank** (`content_bank`):
   - Opslag en beheer van gegenereerde posts
   - Feedback loop voor profiel updates

#### Quality Gate System

- **Evaluator**: Beoordeelt gegenereerde content
  - Check tegen ProfileCard (voice, audience, offer, constraints)
  - Banned phrases detection
  - Tone consistency

- **Gate**: Besluit of content voldoet
  - Auto-rewrite bij failure (max retries)
  - Feedback naar gebruiker bij persistent failure

#### Feedback Loop

- User geeft rating (1-5 sterren) + notes op Output
- Feedback wordt gebruikt voor ProfileCard update
- Nieuwe versie van ProfileCard wordt gesynthetiseerd
- Toekomstige generaties gebruiken nieuwe versie

**Technische Flow**:

1. **Profiel Opbouw**:
   ```
   User gaat naar /account/personalization
   → Wizard stelt foundations vragen
   → Antwoorden → ProfileAnswer records
   → POST /api/profile/synthesize
   → OpenAI synthesiseert ProfileCard (versie 1)
   → Store ProfileCard
   → Update ProfileState
   ```

2. **Content Generatie (Thought to Post)**:
   ```
   User input: "Ik wil iets schrijven over duurzaamheid"
   → POST /api/thought/interview
   → OpenAI genereert 3-6 verdienstingsvragen
   → User beantwoordt vragen
   → POST /api/generate/linkedin
   → Build prompt met:
     - Thought + answers
     - ProfileCard (effective profile)
     - Examples (good/bad)
   → OpenAI generates post
   → Quality gate evaluatie
   → Auto-rewrite indien nodig
   → Store Output
   → Return to user
   ```

3. **Profiel Update via Feedback**:
   ```
   User geeft feedback op Output (rating + notes)
   → POST /api/outputs/[id]/feedback
   → Fetch alle feedbacks voor workspace
   → Fetch ProfileCard (laatste versie)
   → POST /api/profile/synthesize
   → OpenAI synthesiseert nieuwe ProfileCard (versie N+1)
   → Store nieuwe versie
   → Toekomstige generaties gebruiken nieuwe versie
   ```

**Prompt System**:

Het platform gebruikt een gestructureerd prompt systeem in `lib/bureauai/prompts/`:

- `profileSynthPrompt.ts`: Synthetiseert ProfileCard uit ProfileAnswers + Examples
- `linkedinGeneratorPrompt.ts`: Genereert LinkedIn posts
- `blogGeneratorPrompt.ts`: Genereert blog posts
- `interviewPrompt.ts`: Genereert verdienstingsvragen
- `brainstormPrompt.ts`: Genereert content ideeën
- `qualityPrompt.ts`: Evalueert content kwaliteit

Alle prompts gebruiken gestructureerde JSON output en zijn specifiek getuned voor het platform's use cases.

---

## Security & Authentication

### Authenticatie Flow

1. **Registratie**:
   ```
   POST /api/auth/register
   → Hash password (bcrypt)
   → Create User record
   → Redirect naar login
   ```

2. **Login**:
   ```
   POST /auth/login
   → NextAuth Credentials provider
   → Verify password hash
   → Create session
   → Redirect naar /dashboard
   ```

3. **Session Management**:
   - NextAuth.js manages sessions
   - JWT tokens stored in cookies
   - Session contains: `user.id`, `user.email`, `user.name`

4. **Protected Routes**:
   - Middleware (`middleware.ts`) checks session
   - Redirect naar `/auth/login` indien niet ingelogd
   - All `/app/*` routes zijn protected

### Multi-Tenancy Security

- **Workspace Isolation**:
  - Alle queries filteren op `workspaceId`
  - Row-level security via Prisma queries
  - User kan alleen eigen workspaces zien

- **Organization Access**:
  - Membership model met roles (OWNER, MEMBER, VIEWER)
  - Organization-scoped resources (Projects, Prompts)

### OAuth Token Security

- **Encryptie**: AES-256-GCM (via `cryptography` library)
- **Encryption Key**: `ENCRYPTION_KEY` (base64 32-byte key)
- **Storage**: Encrypted tokens in `Connection.authJson` (JSON string)
- **Decryptie**: Alleen in Intel Service (buiten Next.js app)

### API Security

- **Intel Service**:
  - `X-Intel-API-Key` header voor protected endpoints
  - `X-Cron-Secret` header voor cron endpoints

- **Agent Runtime**:
  - `X-AGENT-SERVICE-KEY` header voor internal endpoints

---

## Deployment Architecture

### Render.com Setup

**Services**:

1. **Next.js Web Service** (bureau-ai-nextjs):
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start Command: `npm start`
   - Port: 3000 (production)
   - Environment Variables:
     - `DATABASE_URL`, `DIRECT_URL` (Supabase Postgres)
     - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
     - `OPENAI_API_KEY`, `OPENAI_MODEL`
     - `NEXT_PUBLIC_INTEL_BASE_URL`
     - `INTEL_API_KEY`, `CRON_SECRET`

2. **Intel Service** (bureau-ai-intel):
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `services/intel`
   - Environment Variables:
     - `DATABASE_URL` (same Supabase Postgres)
     - `ENCRYPTION_KEY` (base64 32-byte)
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI` (of `GOOGLE_OAUTH_REDIRECT_URL`)
     - `NEXTJS_BASE_URL` (Next.js app URL)
     - `INTEL_API_KEY`, `CRON_SECRET`

3. **Render Cron Job** (voor daily sync):
   - Schedule: `0 2 * * *` (2 AM UTC daily)
   - Command: `curl -X POST "https://<intel-service-url>/internal/cron/sync-daily" -H "X-Cron-Secret: ${CRON_SECRET}" -H "Content-Type: application/json" -d '{"provider": "GOOGLE_ANALYTICS"}'`

### Database Migrations

- **Development**: `npx prisma migrate dev --name <naam>`
  - Creates new migration
  - Applies migration
  - Generates Prisma Client

- **Production**: `npx prisma migrate deploy`
  - Applies existing migrations only
  - No client generation (already in build step)

- **Never use**: `prisma db push` in production (loses migration history)

### Environment Variables Checklist

**Next.js Service**:
- ✅ `DATABASE_URL` (Supabase Postgres)
- ✅ `DIRECT_URL` (same as DATABASE_URL for Supabase)
- ✅ `NEXTAUTH_URL` (production URL)
- ✅ `NEXTAUTH_SECRET` (random secret)
- ✅ `OPENAI_API_KEY` (OpenAI API key)
- ✅ `OPENAI_MODEL` (optional, default: gpt-4.1-mini)
- ✅ `NEXT_PUBLIC_INTEL_BASE_URL` (Intel service URL)
- ✅ `INTEL_API_KEY` (same as Intel service)
- ✅ `CRON_SECRET` (same as Intel service)

**Intel Service**:
- ✅ `DATABASE_URL` (same Supabase Postgres)
- ✅ `ENCRYPTION_KEY` (base64 32-byte, generate: `openssl rand -base64 32`)
- ✅ `GOOGLE_CLIENT_ID` (Google Cloud Console)
- ✅ `GOOGLE_CLIENT_SECRET` (Google Cloud Console)
- ✅ `GOOGLE_REDIRECT_URI` (of `GOOGLE_OAUTH_REDIRECT_URL`) → `https://<intel-service-url>/oauth/ga4/callback`
- ✅ `NEXTJS_BASE_URL` (Next.js service URL)
- ✅ `INTEL_API_KEY` (same as Next.js)
- ✅ `CRON_SECRET` (same as Next.js)

---

## Design Decisions & Rationale

### 1. Monorepo Structuur

**Waarom**: 
- Shared types en utilities tussen services
- Consistente codebase
- Eenvoudiger development workflow

### 2. FastAPI voor OAuth/Data Sync

**Waarom**:
- Python heeft betere Google API libraries (google-auth, google-analytics-data)
- Eenvoudigere OAuth flows dan Node.js
- Goede async support voor data sync

### 3. Prisma ORM

**Waarom**:
- Type-safe database access (TypeScript types gegenereerd uit schema)
- Migrations management built-in
- Schema-first approach (betere team collaboration)

### 4. Workspace-based Multi-tenancy

**Waarom**:
- Eenvoudiger dan complex Row-Level Security (RLS)
- Alle queries filteren op `workspaceId`
- Duidelijke data isolatie
- Schaalbaar zonder RLS overhead

### 5. Encrypted authJson

**Waarom**:
- OAuth tokens zijn gevoelige data
- Nooit in plaintext in database
- AES-256-GCM encryptie (authenticated encryption)
- Decryptie alleen in Intel Service (buiten Next.js)

### 6. Next.js App Router

**Waarom**:
- React Server Components voor optimale performance
- Geen client-side JavaScript voor static content
- Betere SEO en initial load times
- Modern React patterns (Server/Client Components)

### 7. Daily Sync Pattern

**Waarom**:
- Idempotent upserts (prevent duplicates)
- Scheduled sync (niet real-time) is voldoende voor analytics
- Error handling en retry logic
- Cron job is betrouwbaarder dan webhooks

### 8. ProfileCard Versioning

**Waarom**:
- Feedback loop vereist historie
- Versies kunnen vergeleken worden
- Rollback mogelijkheid
- A/B testing mogelijk

---

## Current Status & Roadmap

### ✅ Live & Working

- **Authenticatie**: NextAuth.js met Credentials provider
- **Data Hub**: Google Analytics OAuth flow volledig werkend
- **GA4 Integration**: Property selection, daily sync endpoint
- **Multi-tenancy**: Workspace-based isolation werkt
- **Agent System**: Templates, activatie, run tracking
- **Bureau-AI**: Profiel wizard, content generatie, quality gate
- **Dashboard**: Overzicht agents, runs, data

### 🚧 In Development

- **Automated Daily Sync**: Render Cron job setup
- **Additional Providers**: Meta Ads, LinkedIn Ads OAuth
- **AI Insights**: Automatische insight generatie
- **Document RAG**: Volledige implementatie met embeddings
- **Content Bank**: UI voor output management

### 📋 Planned Features

- **Advanced Analytics**: Cross-channel insights
- **Agent Marketplace**: User-generated templates
- **API Access**: REST API voor externe integraties
- **Webhooks**: Outgoing webhooks voor events
- **Export**: Data export (CSV, PDF)

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Next.js
npm install
npm run dev  # localhost:3000

# Terminal 2: Intel Service
cd services/intel
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001  # localhost:8001

# Terminal 3: Database
npx prisma studio  # Database GUI
```

### Database Migrations

```bash
# Development: create and apply migration
npx prisma migrate dev --name add_new_feature

# Production: apply existing migrations
npx prisma migrate deploy

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### Testing OAuth Locally

1. Set `NEXTJS_BASE_URL=http://localhost:3000` in Intel service `.env`
2. Set `GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/ga4/callback` in Google Console
3. Run both services
4. Test OAuth flow via `/data/google-analytics`

---

## Key Files & Locations

### Critical Configuration Files

- `prisma/schema.prisma` - Database schema (single source of truth)
- `lib/auth.ts` - NextAuth configuration
- `lib/prisma.ts` - Prisma client singleton
- `middleware.ts` - Route protection
- `services/intel/app/config.py` - Intel service config
- `services/intel/app/crypto.py` - Token encryption

### Core Business Logic

- `lib/bureauai/repo.ts` - Database operations
- `lib/bureauai/effectiveProfile.ts` - Profile resolution
- `lib/bureauai/prompts/*.ts` - LLM prompts
- `lib/bureauai/quality/*.ts` - Quality gate logic
- `app/api/generate/*.ts` - Content generation endpoints
- `services/intel/app/providers/ga4_sync.py` - GA4 sync logic

### UI Components

- `components/DashboardContent.tsx` - Main dashboard
- `components/DataHubContent.tsx` - Data Hub interface
- `components/bureauai/AppShell.tsx` - Bureau-AI interface
- `components/AgentsCatalog.tsx` - Agents overview

---

## Conclusie

Bureau-AI is een volledig functioneel, multi-tenant SaaS-platform dat drie kernfunctionaliteiten combineert:
- **Data Hub** voor gecentraliseerde marketing analytics
- **AI Agents** voor workflow automatisering
- **Bureau-AI Content Engine** voor gepersonaliseerde content generatie

Het platform is gebouwd met moderne technologieën (Next.js 14, FastAPI, Prisma, Supabase) en volgt best practices voor security, multi-tenancy, en schaalbaarheid. De architectuur is modulair en uitbreidbaar, met duidelijke scheiding tussen frontend, backend services, en database layers.

Het systeem is production-ready voor de core features en heeft een solide basis voor toekomstige uitbreidingen.

