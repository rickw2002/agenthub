# Implementatie Plan: 3 Bureau-AI Tools

## Overzicht
Transformeer de huidige Bureau-AI pagina naar 3 hoofdmodi:
1. **Brainstorm** - Ideeën genereren
2. **Thought to Post** - Gedachte uitwerken tot post (bestaande LinkedIn/Blog)
3. **Content Bank** - Opslag en beheer van gegenereerde content

---

## Stap 1: Refactor Pagina Structuur

### 1.1 Update Bureau-AI Pagina Component
**Bestand:** `app/(app)/bureau-ai/page.tsx`

**Wijzigingen:**
- Vervang huidige `activeTool` state van `"linkedin" | "blog"` naar `"brainstorm" | "thought-to-post" | "content-bank"`
- Voeg 3 hoofdmodi tabs toe bovenaan
- Binnen "Thought to Post": behoud LinkedIn/Blog sub-tabs
- Herstructureer state management per mode

**Structuur:**
```tsx
const [activeMode, setActiveMode] = useState<"brainstorm" | "thought-to-post" | "content-bank">("thought-to-post");
const [activeChannel, setActiveChannel] = useState<"linkedin" | "blog">("linkedin"); // binnen thought-to-post
```

---

## Stap 2: Brainstorm Mode

### 2.1 Brainstorm UI Component
**Bestand:** `app/(app)/bureau-ai/page.tsx` (nieuwe sectie)

**Features:**
- Textarea voor onderwerp/context (optioneel)
- Externe bronnen input (URL, YouTube, LinkedIn post, Bestand) - voor nu alleen UI, later implementeren
- Dropdown voor "Soort post" (optioneel)
- "Genereer ideeën" knop
- Resultaat: lijst met content ideeën
- "Opslaan naar Content Bank" knop per idee

**State:**
```tsx
const [brainstormTopic, setBrainstormTopic] = useState("");
const [brainstormIdeas, setBrainstormIdeas] = useState<string[]>([]);
const [brainstormLoading, setBrainstormLoading] = useState(false);
```

### 2.2 Brainstorm API Endpoint
**Bestand:** `app/api/generate/brainstorm/route.ts`

**Functionaliteit:**
- Input: `{ topic?: string, postType?: string, projectId?: string | null }`
- Gebruik profiel (getEffectiveProfile)
- Genereer lijst met 5-10 content ideeën
- Output: `{ ok: true, ideas: string[] }`
- Sla op als Output met `mode: "brainstorm"`

**Prompt structuur:**
- System: "Je bent een content strategist die creatieve LinkedIn content ideeën bedenkt"
- User: topic + profiel context
- Output: JSON array met ideeën

---

## Stap 3: Thought to Post Refactor

### 3.1 Update Thought to Post UI
**Bestand:** `app/(app)/bureau-ai/page.tsx`

**Wijzigingen:**
- Verplaats LinkedIn/Blog tabs naar binnen Thought to Post mode
- Behoud alle bestaande functionaliteit
- Voeg optionele velden toe:
  - "Soort post" dropdown (TOFU/MOFU/BOFU)
  - "Funnel fase" dropdown (optioneel)
- Update button tekst naar "Werk uit" (in plaats van "Generate LinkedIn post")

**UI Structuur:**
```
Thought to Post Tab
  ├── LinkedIn sub-tab
  │   ├── Thought textarea
  │   ├── Lengte dropdown
  │   ├── Soort post dropdown (nieuw)
  │   └── "Werk uit" button
  └── Blog sub-tab
      ├── Thought textarea
      ├── Lengte dropdown
      └── "Werk uit" button
```

### 3.2 Update API Endpoints
**Bestanden:** 
- `app/api/generate/linkedin/route.ts`
- `app/api/generate/blog/route.ts`

**Wijzigingen:**
- Accepteer optionele `postType` en `funnelPhase` in request body
- Sla op in `inputJson` voor latere referentie
- Update `mode` naar `"thought_to_post"` (al correct)

---

## Stap 4: Content Bank

### 4.1 Content Bank UI Component
**Bestand:** `app/(app)/bureau-ai/page.tsx` (nieuwe sectie)

**Features:**
- 3 sub-tabs: "Favorieten", "Alle ideeën", "Bronnen"
- Zoekbalk
- Filters:
  - "Soort post" dropdown
  - "Funnel fase" dropdown
  - "Ideation modus" dropdown (brainstorm/thought-to-post)
- Lijst met Output records
- Per item:
  - Preview content
  - Favoriet toggle
  - Bewerken knop
  - Verwijderen knop
  - "Gebruik voor nieuwe post" knop

**State:**
```tsx
const [contentBankFilter, setContentBankFilter] = useState<"favorites" | "all" | "sources">("all");
const [contentBankSearch, setContentBankSearch] = useState("");
const [outputs, setOutputs] = useState<Output[]>([]);
const [contentBankLoading, setContentBankLoading] = useState(false);
```

### 4.2 Content Bank API Endpoint
**Bestand:** `app/api/outputs/route.ts`

**GET /api/outputs**
- Query params: `?filter=favorites|all|sources&search=...&postType=...&funnelPhase=...&mode=...`
- Haal Output records op voor workspace
- Filter op basis van query params
- Return: `{ ok: true, outputs: Output[] }`

**PATCH /api/outputs/[id]/favorite**
- Toggle favoriet status (opslaan in Output.inputJson of nieuw veld)
- Return: `{ ok: true, isFavorite: boolean }`

**DELETE /api/outputs/[id]**
- Verwijder Output record
- Return: `{ ok: true }`

### 4.3 Output Model Update (optioneel)
**Bestand:** `prisma/schema.prisma`

**Optie A:** Gebruik `inputJson` voor favoriet status
**Optie B:** Voeg `isFavorite Boolean @default(false)` veld toe

**Aanbeveling:** Optie A (geen migration nodig)

---

## Stap 5: Integratie & UX Verbeteringen

### 5.1 Opslaan naar Content Bank
- Na generatie (Brainstorm of Thought to Post): "Opslaan" knop
- Direct opslaan als Output met juiste mode
- Toon bevestiging

### 5.2 Hergebruik vanuit Content Bank
- "Gebruik voor nieuwe post" knop
- Laad content in Thought to Post textarea
- Gebruiker kan aanpassen en opnieuw genereren

### 5.3 Empty States
- Brainstorm: "Genereer je eerste ideeën..."
- Content Bank: "Geen ideeën gevonden. Klik om nieuwe te maken."
- Gebruik dezelfde minimalistische illustratie stijl

---

## Stap 6: Design System Consistentie

### 6.1 Componenten Hergebruik
- Gebruik bestaande `Card`, `Button`, `Input`, `Textarea`, `Tabs`
- Zelfde kleuren: zinc-50, zinc-900, etc.
- Zelfde rounded corners (rounded-xl)
- Zelfde spacing (space-y-6, p-6)

### 6.2 Icons (optioneel)
- Brainstorm: lightbulb icon
- Thought to Post: pen/document icon
- Content Bank: folder/envelope icon
- Gebruik SVG icons of heroicons

---

## Implementatie Volgorde

1. ✅ **Stap 1**: Refactor pagina structuur (3 hoofdmodi)
2. ✅ **Stap 3**: Thought to Post refactor (behoud functionaliteit)
3. ✅ **Stap 4**: Content Bank UI + API
4. ✅ **Stap 2**: Brainstorm implementatie
5. ✅ **Stap 5**: Integratie & UX
6. ✅ **Stap 6**: Design polish

---

## API Endpoints Overzicht

```
POST   /api/generate/brainstorm     - Genereer content ideeën
GET    /api/outputs                 - Haal Output records op (met filters)
PATCH  /api/outputs/[id]/favorite   - Toggle favoriet
DELETE /api/outputs/[id]            - Verwijder Output
POST   /api/generate/linkedin       - (bestaand, update inputJson)
POST   /api/generate/blog           - (bestaand, update inputJson)
```

---

## Database Schema

**Output Model (bestaand):**
- `mode`: `thought_to_post` | `brainstorm` | `batch_qa` | `content_bank`
- `inputJson`: bevat topic, postType, funnelPhase, etc.
- `content`: gegenereerde content
- `channel`: `linkedin` | `blog`

**Geen nieuwe migrations nodig** - alles past in bestaand schema.

---

## Testing Checklist

- [ ] 3 hoofdmodi tabs werken
- [ ] Thought to Post: LinkedIn/Blog sub-tabs werken
- [ ] Brainstorm genereert ideeën
- [ ] Content Bank toont Output records
- [ ] Filters werken in Content Bank
- [ ] Favorieten toggle werkt
- [ ] Opslaan naar Content Bank werkt
- [ ] Hergebruik vanuit Content Bank werkt
- [ ] Design consistent met rest van platform

