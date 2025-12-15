# AgentHub - AI Agents & Workflows Platform

SaaS-platform voor MKB-bedrijven om AI agents en workflows te activeren en beheren.

## Technische Stack

- **Framework**: Next.js 14 (App Router)
- **Taal**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma + Postgres (Supabase)
- **Auth**: NextAuth.js met Credentials provider

## Project Setup

### 1. Dependencies installeren

```bash
npm install
```

### 2. Environment variabelen

Kopieer `env.example` naar `.env` en pas indien nodig aan:

```bash
cp env.example .env
```

Of maak handmatig een `.env` bestand aan met de volgende inhoud:
```
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-to-a-random-secret-in-production"
```

Zorg ervoor dat `NEXTAUTH_SECRET` een willekeurige string is (bijv. gegenereerd met `openssl rand -base64 32`).

### 3. Database setup

Initialiseer de database en voer migraties uit:

```bash
npx prisma migrate dev --name init
```

Dit maakt de database aan en voert de eerste migratie uit (User model).

**Na het toevoegen van nieuwe modellen** (bijv. na stap 4):

```bash
npx prisma migrate dev --name add_agent_models
```

Dit voert een nieuwe migratie uit met de toegevoegde modellen (AgentTemplate, UserAgent, RunLog).

### 4. Database seeden (na stap 5)

Voer demo-data toe aan de database:

```bash
npm run db:seed
```

Of direct met Prisma:

```bash
npx prisma db seed
```

Dit voegt 5 voorbeeld AgentTemplates toe aan de database.

### 5. Development server starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Project Structuur

```
/app
  /(auth)          # Authenticatie routes (login, register)
  /(app)           # Ingelogde gebruikers routes (dashboard, agents, etc.)
  /api             # API routes
    /auth          # NextAuth endpoints
/lib               # Utility functies (prisma client, auth config)
/prisma            # Prisma schema en migraties
```

## Beschikbare Scripts

- `npm run dev` - Start development server
- `npm run build` - Build voor productie
- `npm run start` - Start productie server
- `npm run db:push` - Push schema naar database (zonder migratie)
- `npm run db:migrate:dev` - Prisma migrate dev (lokale ontwikkeling)
- `npm run db:migrate:deploy` - Prisma migrate deploy (production/staging)
- `npm run db:generate` - Prisma client genereren
- `npm run db:migrate` - Voer migraties uit
- `npm run db:seed` - Seed database met demo-data
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Database workflow
- Dev: `npx prisma migrate dev --name <beschrijvende-naam>` (houd schema + migraties in sync, client wordt gegenereerd)
- Prod/Staging: `npx prisma migrate deploy` (past bestaande migraties toe, maakt geen nieuwe)
- Seed (optioneel, alleen waar veilig): `npm run db:seed`
- `prisma db push` alleen gebruiken op lege, niet- gedeelde test-omgevingen; niet voor staging/production of wanneer migratiegeschiedenis nodig is.

## Status

**Stap 1 - Project Setup**: ✅ Voltooid

- Next.js project met TypeScript en App Router
- Tailwind CSS geconfigureerd
- Prisma met SQLite database
- NextAuth basisconfiguratie
- User model in Prisma
- Basis layout structuur voor auth en app routes

**Stap 2 - Auth flows (login & register)**: ✅ Voltooid

- NextAuth Credentials provider geïmplementeerd met wachtwoord verificatie
- API route voor gebruikersregistratie (`/api/auth/register`)
- Login pagina (`/auth/login`) met formulier en foutafhandeling
- Register pagina (`/auth/register`) met validatie
- Middleware voor route-bescherming (beschermde routes redirecten naar login)
- Uitlog functionaliteit
- SessionProvider geconfigureerd
- TypeScript types voor NextAuth sessie

**Stap 3 - Basis app-layout en navigatie**: ✅ Voltooid

- Top-navigatiebalk met links naar alle hoofdmenu's
- Navigation component met actieve pagina highlighting
- Mobile-responsive menu (hamburger menu)
- Placeholder pagina's voor alle routes:
  - `/dashboard` - Dashboard placeholder
  - `/agents` - Agents overzicht placeholder
  - `/workflows` - Workflows placeholder
  - `/library` - Library placeholder
  - `/support` - Support placeholder
  - `/account` - Account placeholder
- Uitlog knop geïntegreerd in navigatie
- Clean layout met voldoende witruimte

**Stap 4 - Prisma modellen uitwerken**: ✅ Voltooid

- AgentTemplate model toegevoegd met:
  - name, slug, category, shortDescription, longDescription
  - type ("agent" of "workflow")
  - difficulty, videoUrl (optioneel)
  - configSchema (JSON veld)
  - timestamps
- UserAgent model toegevoegd met:
  - Relatie naar User en AgentTemplate
  - name (door user gekozen)
  - config (JSON met instellingen)
  - status ("active", "inactive", "incomplete")
  - timestamps
- RunLog model toegevoegd met:
  - Relatie naar UserAgent
  - status ("success" / "error")
  - summary (korte tekst)
  - createdAt timestamp
- Alle relaties correct gedefinieerd met cascade delete
- JSON velden opgeslagen als String (SQLite compatibel)

**Stap 5 - Seeden van demo-data (AgentTemplates)**: ✅ Voltooid

- Seed script aangemaakt (`prisma/seed.ts`) met 5 AgentTemplates:
  - AI Virtual Assistant (Inbox) - Operations, beginner
  - LinkedIn Content Maker - Marketing, beginner
  - PDF Scraper / Analyzer - Operations, advanced (workflow)
  - Email Reply Helper - Sales, beginner
  - Lead Research Agent - Sales, advanced
- Voor elk template:
  - Volledige beschrijvingen (short + long)
  - ConfigSchema met dynamische velden (email, select, boolean, text, multiselect)
  - Verschillende categorieën en moeilijkheidsgraden
- Package.json geconfigureerd met Prisma seed script
- README bijgewerkt met seed instructies

**Stap 6 - Agents cataloguspagina (/agents)**: ✅ Voltooid

- Server component die alle AgentTemplates ophaalt uit database
- AgentsCatalog client component met:
  - Zoekbalk voor filtering op naam en beschrijving
  - Filter chips voor Category (Sales, Marketing, Operations)
  - Filter chips voor Type (Agent, Workflow)
  - Resultaten teller
  - Responsive grid layout (1 kolom mobile, 2 tablet, 3 desktop)
- Agent cards met:
  - Category badge (gekleurd per categorie)
  - Type badge
  - Difficulty badge (Beginner-friendly / Advanced)
  - Titel en korte beschrijving
  - "Bekijk details" knop naar /agents/[slug]
- Client-side filtering (geen server requests nodig)
- Hover effecten en transitions
- Lege staat wanneer geen resultaten

**Stap 7 - Agent detailpagina (/agents/[slug])**: ✅ Voltooid

- Dynamic route voor agent detailpagina op basis van slug
- AgentDetail component met:
  - Header met badges (category, type, difficulty)
  - Video placeholder (iframe als videoUrl bestaat, anders "Video coming soon")
  - Tabs implementatie met 4 tabs:
    - "Over deze agent": Bulletpoints uit longDescription
    - "Installatie & configuratie": Statische uitleg
    - "FAQ": 5 voorbeeldvragen/antwoorden
    - "Support": Contact informatie en mailto link
  - Configuratiepaneel (sticky sidebar):
    - Agent naam input
    - Dynamische formuliervelden op basis van configSchema:
      - Email velden
      - Text inputs
      - Select dropdowns
      - Multiselect checkboxes
      - Boolean checkboxes
    - "Agent activeren" knop
- API route `/api/agents/activate` voor het aanmaken van UserAgent
- Foutafhandeling met not-found pagina
- Redirect naar dashboard na succesvolle activatie
- Responsive layout (2 kolommen desktop, 1 kolom mobile)

**Stap 8 - Dashboard invullen (/dashboard)**: ✅ Voltooid

- DashboardContent component met volledige dashboard functionaliteit
- Welkom blok met gebruikersnaam en korte introductie
- Onboarding checklist (statisch) met 4 items:
  - Kijk de introductievideo
  - Activeer je eerste agent (dynamisch: checked als userAgents > 0)
  - Configureer je eerste workflow (dynamisch: checked als er Operations agents zijn)
  - Bekijk de Library voor tips
- Sectie "Mijn actieve agents":
  - Grid layout met cards voor elke UserAgent
  - Toont: naam, template naam, status badge
  - "Ga naar detail" knop naar agent detailpagina
  - Lege staat met CTA naar agents catalogus
- Sectie "Recente activiteit":
  - Lijst met laatste 10 RunLog entries
  - Toont: datum/tijd, UserAgent naam, status badge, summary
  - Lege staat met uitleg
- Data ophalen:
  - UserAgents met AgentTemplate relatie
  - RunLogs met UserAgent relatie (laatste 10, gesorteerd op datum)
- Responsive layout (2 kolommen desktop, 1 kolom mobile)
- Status badges met kleuren (active=groen, inactive=grijs, incomplete=geel)

**Volgende stap**: Stap 9 - Workflows, Library, Support, Account invulling

