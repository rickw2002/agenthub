# Data Hub - Oorspronkelijke Implementatie

Dit document beschrijft exact hoe de Data Hub in het begin was gebouwd.

## Overzicht

De Data Hub is een cross-channel data aggregatie en chat systeem dat:
- Data verzamelt van meerdere providers (Google Ads, Meta Ads, LinkedIn, etc.)
- Een overzicht geeft van alle kanalen in één dashboard
- Een chat-assistent biedt die vragen kan beantwoorden over de data
- Inzichten genereert en toont per provider

---

## 1. Database Schema

### 1.1 Connection Model
**Doel**: Track connectiestatus per user en provider

```prisma
model Connection {
  id        String   @id @default(cuid())
  userId    String
  provider  String   // GOOGLE_ADS | META_ADS | LINKEDIN | WEBSITE | EMAIL | SUPPORT
  status    String   // CONNECTED | PENDING | ERROR | NOT_CONNECTED
  authJson  String?  // JSON stored as string (credentials)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@index([userId])
  @@index([userId, provider])
}
```

**Gebruik**: 
- Eén record per user+provider combinatie
- Slaat auth credentials op (versleuteld in JSON)
- Status tracking voor connectie workflow

### 1.2 MetricDaily Model
**Doel**: Dagelijkse metrics snapshots per provider

```prisma
model MetricDaily {
  id             String   @id @default(cuid())
  userId         String
  provider       String   // GOOGLE_ADS | META_ADS | LINKEDIN | WEBSITE | EMAIL | SUPPORT
  date           DateTime
  metricsJson    String   // JSON stored as string
  dimensionsJson String?  // JSON stored as string (optioneel)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, provider])
  @@index([userId, provider, date])
}
```

**Metrics JSON structuur**:
```typescript
interface MetricsData {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr?: number;              // Click-through rate
  cpc?: number;             // Cost per click
  conversionRate?: number;   // Conversion percentage
}
```

**Gebruik**:
- Eén record per dag per provider per user
- Metrics worden opgeslagen als JSON string
- Indexed voor snelle queries op user+provider+date

### 1.3 Insight Model
**Doel**: Inzichten en suggesties per provider

```prisma
model Insight {
  id          String   @id @default(cuid())
  userId      String
  provider    String?  // GOOGLE_ADS | META_ADS | LINKEDIN | WEBSITE | EMAIL | SUPPORT | null voor master
  title       String
  summary     String
  severity    String   // INFO | WARNING | CRITICAL
  period      String?  // Bijv. "last_7_days"
  dataRefJson String?  // JSON stored as string (referenties naar data)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, provider])
}
```

**Gebruik**:
- Inzichten kunnen provider-specifiek zijn of master-level (provider = null)
- Severity bepaalt urgentie/prioriteit
- dataRefJson kan verwijzen naar specifieke metrics of periodes

### 1.4 ChatMessage Model
**Doel**: Conversatie log voor chat-assistent

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  scope     String   // "MASTER" | "GOOGLE_ADS" | "META_ADS" | "LINKEDIN" | etc.
  role      String   // "USER" | "ASSISTANT"
  content   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, scope])
}
```

**Gebruik**:
- Scope bepaalt context: MASTER = cross-channel, anders provider-specifiek
- Alle berichten worden opgeslagen voor conversatie geschiedenis
- Indexed voor snelle queries per user+scope

---

## 2. API Routes

### 2.1 `/api/data/overview` (GET)
**Doel**: Overzicht van alle providers met laatste 7 dagen data

**Implementatie**: `app/api/data/overview/route.ts`

**Flow**:
1. Authenticatie check (`requireAuth()`)
2. Haal alle connections op voor user
3. Haal laatste 7 dagen metrics op (`MetricDaily`)
4. Haal laatste insights op (`Insight`)
5. Bouw provider summaries:
   - Status (CONNECTED/NOT_CONNECTED)
   - KPIs van laatste dag
   - 7-dagen serie voor grafieken
   - Laatste 3 insights

**Response structuur**:
```typescript
{
  summaries: Array<{
    provider: string;
    status: string;
    kpis: {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    };
    series7d: Array<{
      date: string; // ISO date
      metrics: {
        impressions: number;
        clicks: number;
        conversions: number;
        spend: number;
      };
    }>;
    latestInsights: Array<{
      id: string;
      title: string;
      summary: string;
      severity: string;
      createdAt: string;
    }>;
  }>;
}
```

### 2.2 `/api/chat` (POST)
**Doel**: Chat-assistent die vragen beantwoordt over data

**Implementatie**: `app/api/chat/route.ts`

**Request body**:
```typescript
{
  scope: "MASTER" | "GOOGLE_ADS" | "META_ADS" | "LINKEDIN" | "WEBSITE" | "EMAIL" | "SUPPORT";
  message: string;
}
```

**Flow voor MASTER scope**:
1. Authenticatie check
2. Valideer scope en message
3. Sla user message op in `ChatMessage`
4. Haal data op:
   - Loop door providers: `["GOOGLE_ADS", "META_ADS", "LINKEDIN"]`
   - Voor elke provider:
     - Haal laatste `MetricDaily` op
     - Haal laatste 2 `Insight` records op
5. Bouw deterministisch fallback antwoord:
   ```
   "Hier is een overzicht van je data:\n\n"
   + provider metrics
   + recente inzichten
   + "Is er iets specifieks dat je wilt weten over je data?"
   ```
6. **OpenAI verrijking**:
   - System prompt: `"Je bent de AgentHub Data Hub assistent. Antwoord in het Nederlands, kort, concreet en actiegericht."`
   - Extra system context: JSON met KPIs en insights
   - User message: originele vraag
   - Roep `generateText()` aan
   - Als AI antwoord beschikbaar: gebruik dat, anders fallback
7. Sla assistant reply op in `ChatMessage`
8. Return `{ reply: string, messageId: string }`

**Flow voor provider-specifieke scope**:
1. Zelfde authenticatie en validatie
2. Haal laatste `MetricDaily` voor die provider op
3. Haal laatste 3 `Insight` records voor die provider op
4. Bouw deterministisch antwoord met provider-specifieke metrics
5. OpenAI verrijking met provider-specifieke context
6. Sla op en return

**Belangrijke details**:
- **Fallback strategie**: Als OpenAI faalt, gebruik deterministisch antwoord
- **Context building**: Alle relevante data wordt als JSON in `extraSystem` gezet
- **Error handling**: Try-catch rond OpenAI call, altijd fallback beschikbaar

---

## 3. Frontend Componenten

### 3.1 Data Hub Page
**Locatie**: `app/(app)/data/page.tsx`

**Doel**: Hoofdpagina voor Data Hub

**Flow**:
1. Server-side data fetching:
   - Haal connections op
   - Haal laatste 7 dagen metrics op
   - Haal alle insights op
2. Bouw overview data (zelfde logica als `/api/data/overview`)
3. Render `DataHubContent` component met overview data

### 3.2 DataHubContent Component
**Locatie**: `components/DataHubContent.tsx`

**Structuur**:
```tsx
<div>
  {/* Header */}
  <div>Data Hub - Overzicht van al je data-kanalen</div>
  
  {/* Master Chat */}
  <div>
    <h2>Master Chat</h2>
    <MasterChat />
  </div>
  
  {/* Channel Cards Grid */}
  <div>
    <h2>Data-kanalen</h2>
    <div className="grid">
      {summaries.map(summary => (
        <ChannelCard key={summary.provider} summary={summary} />
      ))}
    </div>
  </div>
</div>
```

### 3.3 MasterChat Component
**Locatie**: `components/MasterChat.tsx`

**Functionaliteit**:
- Client-side React component
- State management:
  - `messages`: Array van berichten
  - `inputValue`: Huidige input
  - `isLoading`: Loading state
  - `error`: Error state
- **Send flow**:
  1. Valideer input
  2. Voeg user message optimistisch toe aan UI
  3. POST naar `/api/chat` met `{ scope: "MASTER", message: inputValue }`
  4. Wacht op response
  5. Voeg assistant reply toe aan messages
  6. Scroll naar beneden
- **UI**:
  - Messages area met scroll
  - User messages rechts (primary color)
  - Assistant messages links (white background)
  - Input form onderaan
  - Loading indicator tijdens request

**Belangrijke details**:
- **Optimistic updates**: User message wordt direct getoond
- **Error handling**: Toon error message, verwijder temp message bij error
- **Auto-scroll**: Scroll naar beneden bij nieuwe messages

---

## 4. Data Flow

### 4.1 Data Ingestie (Extern)
**Aanname**: Data wordt extern ingevoerd via:
- N8N workflows
- Directe API calls
- Scheduled jobs

**Data wordt opgeslagen in**:
- `Connection`: Connectiestatus updates
- `MetricDaily`: Dagelijkse metrics (één per dag per provider)
- `Insight`: Inzichten gegenereerd door externe systemen

### 4.2 Data Consumptie
**Flow**:
1. User opent Data Hub pagina
2. Server-side fetch van data (connections, metrics, insights)
3. Data wordt getoond in:
   - Channel cards (overview)
   - Master Chat (via API calls)
4. User stelt vraag in chat
5. API haalt relevante data op
6. OpenAI genereert antwoord met context
7. Antwoord wordt getoond en opgeslagen

---

## 5. Architectuur Beslissingen

### 5.1 Waarom JSON strings?
- **Flexibiliteit**: Verschillende providers hebben verschillende metrics
- **Schema evolutie**: Nieuwe metrics kunnen worden toegevoegd zonder migration
- **Simplicity**: Geen complexe nested relations

**Trade-off**: 
- Geen type safety op database niveau
- Parsing nodig bij gebruik
- Geen database-level queries op metrics

### 5.2 Waarom deterministische fallback?
- **Reliability**: Altijd een antwoord, ook als OpenAI faalt
- **Cost control**: Geen onnodige API calls bij simpele vragen
- **User experience**: Direct antwoord zonder wachten op LLM

### 5.3 Waarom scope-based chat?
- **Context isolation**: Provider-specifieke vragen krijgen relevante context
- **Performance**: Minder data ophalen voor specifieke scopes
- **UX**: Duidelijkere context voor gebruiker

### 5.4 Waarom server-side data fetching?
- **Performance**: Data wordt opgehaald tijdens SSR
- **SEO**: Content is direct beschikbaar
- **Security**: Geen client-side database queries

---

## 6. Oorspronkelijke Implementatie Details

### 6.1 Database Migration
**Bestand**: `prisma/migrations/20251213082918_add_data_hub_models/migration.sql`

**Wat werd aangemaakt**:
- 4 nieuwe tabellen: `Connection`, `MetricDaily`, `Insight`, `ChatMessage`
- Indexes voor performance
- Foreign keys naar `User` table
- Unique constraints waar nodig

### 6.2 Valid Scopes
```typescript
const VALID_SCOPES = [
  "MASTER",
  "GOOGLE_ADS",
  "META_ADS",
  "LINKEDIN",
  "WEBSITE",
  "EMAIL",
  "SUPPORT",
] as const;
```

### 6.3 Providers
```typescript
const PROVIDERS = [
  "GOOGLE_ADS", 
  "META_ADS", 
  "LINKEDIN", 
  "WEBSITE", 
  "EMAIL", 
  "SUPPORT"
] as const;
```

### 6.4 OpenAI Integration
**Functie**: `generateText()` uit `@/lib/ai`

**Gebruik in chat**:
```typescript
const aiReply = await generateText({
  system: "Je bent de AgentHub Data Hub assistent...",
  extraSystem: "Context (JSON):\n" + JSON.stringify(context, null, 2),
  user: message,
});
```

**Temperature**: Niet expliciet gezet (default gebruikt)

---

## 7. Oorspronkelijke Features

### 7.1 Master Chat
- Cross-channel vragen beantwoorden
- Aggregatie van alle providers
- OpenAI-powered antwoorden met fallback

### 7.2 Channel Overview
- Status per provider (CONNECTED/NOT_CONNECTED)
- KPIs van laatste dag
- 7-dagen trend data
- Laatste insights

### 7.3 Provider-specific Chat
- Per provider aparte chat context
- Provider-specifieke metrics en insights
- Zelfde OpenAI + fallback strategie

---

## 8. Technische Stack

- **Database**: PostgreSQL via Prisma ORM
- **Backend**: Next.js API routes
- **Frontend**: React (Next.js App Router)
- **LLM**: OpenAI via `generateText()` helper
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS

---

## 9. Belangrijke Code Locaties

### Backend
- `app/api/chat/route.ts` - Chat API endpoint
- `app/api/data/overview/route.ts` - Overview API endpoint
- `app/(app)/data/page.tsx` - Data Hub pagina

### Frontend
- `components/DataHubContent.tsx` - Main Data Hub component
- `components/MasterChat.tsx` - Chat interface
- `components/ChannelCard.tsx` - Provider card component

### Database
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/20251213082918_add_data_hub_models/` - Oorspronkelijke migration

---

## 10. Evolutie Sinds Oorspronkelijke Build

**Toevoegingen** (niet in originele build):
- Channel-specific chat pages (`app/(app)/data/[provider]/page.tsx`)
- `ChannelChat` component voor provider-specifieke chats
- Mogelijk extra data processing/aggregatie

**Kern blijft hetzelfde**:
- Database schema (Connection, MetricDaily, Insight, ChatMessage)
- API routes structuur
- Master Chat functionaliteit
- OpenAI + fallback strategie

---

## Conclusie

De Data Hub was oorspronkelijk gebouwd als een **eenvoudig maar effectief systeem**:
1. **Database**: 4 modellen voor connections, metrics, insights en chat
2. **API**: 2 endpoints (overview + chat) met deterministische fallbacks
3. **Frontend**: Server-side rendered pagina met client-side chat component
4. **LLM**: OpenAI integratie met context-aware prompts en fallback strategie

De architectuur is **flexibel** (JSON storage), **betrouwbaar** (fallbacks), en **schaalbaar** (indexed queries, scope-based isolation).




