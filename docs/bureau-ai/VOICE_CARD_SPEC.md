## Bureau-AI – Voice Card Spec (V1)

Deze spec beschrijft hoe de **stem** van een gebruiker wordt vastgelegd in versieerbare cards.
De Voice Card wordt gebruikt door alle generators (LinkedIn, Blog, …) en door de quality gate.

De daadwerkelijke Zod-schema’s leven in `lib/llm/schemas/voiceCard.schema.ts` (en gerelateerde files),
maar deze spec is de bron van waarheid voor betekenis en velden.

### 1. Doel van de Voice Card

- Eén compacte, gestructureerde representatie van:
  - **toon & stijl** (formeel/informeel, tempo, directheid),
  - **persoonlijkheid** (rol, archetype),
  - **woordkeuze & schrijfregels** (do’s & don’ts),
  - **voorbeeldfragmenten** (optioneel).
- Moet geschikt zijn voor:
  - **prompting** (systeemregels voor het model),
  - **evaluatie** (quality gate: voice match / mismatch),
  - **evolutie** (feedback → nieuwe versies).

### 2. VoiceCardV1 – velden

**Type-naam:** `VoiceCardV1`  
**Opslag:** `ProfileCard.voiceCard` (JSONB)  

#### 2.1 Metadata

- **`version`**: `string`
  - Altijd `"VoiceCardV1"` voor dit schema.
- **`createdFrom`**: `string[]`
  - Lijst van bronnen, bijv. `["foundations", "examples", "feedback"]`.

#### 2.2 Kernstijl

- **`toneKeywords`**: `string[]`
  - 3–8 kernwoorden die de toon beschrijven.
  - Voorbeeld: `["nuchter", "direct", "speels", "toegankelijk"]`.

- **`formality`**: `"zeer_informeel" | "informeel" | "neutraal" | "formeel" | "zeer_formeel"`
  - Afgeleid uit `foundations.formality_level`.

- **`energyLevel`**: `"laag" | "gemiddeld" | "hoog"`
  - Hoe energiek de teksten voelen (uitroeptekens, tempo, enthousiasme).

- **`rolePersona`**: `string`
  - Korte omschrijving van de “vertelstem”.
  - Voorbeeld: `"ervaren performance marketeer die praktisch en eerlijk is"`.

#### 2.3 Schrijfstijlregels

- **`sentenceLength`**:
  - **`preferred`**: `"kort" | "gemengd" | "lang"`
  - **`notes`**: `string`
  - Beschrijft gemiddelde zinslengte + uitzonderingen.

- **`structurePreferences`**:
  - **`likesBullets`**: `boolean`
  - **`maxBulletsPerList`**: `number` (bijv. 5)
  - **`paragraphLength`**: `"kort" | "gemengd" | "lang"`

- **`emojiUsage`**:
  - **`allowed`**: `boolean`
  - **`maxPerPost`**: `number`
  - **`styleNotes`**: `string` (bijv. “gebruik alleen relevante emoji, geen smiley-spam”).

- **`questionsUsage`**:
  - **`usesQuestions`**: `boolean`
  - **`frequency`**: `"laag" | "gemiddeld" | "hoog"`
  - **`notes`**: `string`

#### 2.4 Taal en aanspreekvorm

- **`languages`**: `string[]`
  - Bijvoorbeeld `["nl"]`, `["nl", "en"]`.

- **`addressingStyle`**:
  - **`pronoun`**: `"jij" | "u" | "mix"`
  - **`plurality`**: `"ik-vorm" | "wij-vorm" | "mix"`
  - Voorbeeld: “ik-vorm met jij/je, geen u”.

#### 2.5 Do’s & Don’ts (voice-specifiek)

> Let op: globale no-go’s zitten in `ConstraintsV1`.  
> Hier focussen we op **stijl** (bijv. geen “ik” overmatig gebruiken) i.p.v. thema’s.

- **`preferredPhrases`**: `string[]`
  - Phrases die typisch zijn voor de persoon (maar niet geforceerd).

- **`avoidStylePatterns`**: `string[]`
  - Beschrijvingen van stijlfouten, bijv.:
  - `"geen overdreven hype-taal"`, `"vermijd passieve zinnen"`, `"niet te veel metaforen"`.

- **`signatureMoves`**: `string[]`
  - Terugkerende stijltrucs die “mag” of juist gewenst zijn:
  - Voorbeeld: `"regelmatig mini-case delen"`, `"vaak een korte anekdote als opening"`.

#### 2.6 Voorbeeldfragmenten (optioneel)

- **`positiveExamples`**: `{ label: string; text: string }[]`
  - Korte stukken tekst (2–6 zinnen) die de voice goed vangen.

- **`negativeExamples`**: `{ label: string; text: string; reason: string }[]`
  - Voorbeelden die **niet** passen bij de voice, met uitleg waarom.
  - Handig voor de quality gate om misfits te herkennen.

### 3. Relatie met andere cards

- **AudienceCardV1**: beschrijft **wie** we aanspreken; VoiceCardV1 bepaalt **hoe** we hen aanspreken.
- **OfferCardV1**: beschrijft **wat** we aanbieden; VoiceCardV1 bepaalt de **toon** van die belofte.
- **ConstraintsV1**: legt harde grenzen vast (banned phrases, CTA-stijl, onderwerpen),
  terwijl VoiceCardV1 de zachte stijlvoorkeuren vastlegt.

### 4. LLM-verwachtingen (synthese)

Bij het genereren van `VoiceCardV1` moet de LLM:

1. **Alle relevante inputs meenemen**:
   - Foundations (`foundations.*`),
   - aangeduide voice-voorbeelden (good/bad),
   - eventueel eerdere outputs + feedback.
2. **Strikt geldige JSON** teruggeven die aan het schema voldoet:
   - geen extra velden buiten dit schema,
   - verplichte velden altijd aanwezig.
3. **Concrete, korte beschrijvingen** gebruiken:
   - voorkeur voor opsommingen en korte zinnen in de card zelf,
   - geen lange verhalende teksten in de metadata.

### 5. Gebruik door generators en quality gate

- **Generators (LinkedIn/Blog)**:
  - Vertalen `VoiceCardV1` naar:
    - systeemregels (“schrijf in een nuchtere, directe toon”),
    - guardrails (max emoji, gebruik jij/je),
    - micro-patterns (veelgestelde vragen, anekdotes).

- **Quality gate**:
  - Vergelijkt gegenereerde tekst met:
    - `toneKeywords` (semantische match),
    - `formality` en `addressingStyle`,
    - `emojiUsage` en `structurePreferences`,
    - `avoidStylePatterns` en `signatureMoves`.
  - Gebruikt dit om een `QualityReportV1` te vullen met o.a.:
    - voice-match-score,
    - concrete suggesties (bijvoorbeeld: “toon is te formeel t.o.v. gewenste informele stijl”).

### 6. Evolutie / feedback

- Feedback op outputs (ratings + notes) kan leiden tot:
  - bijsturen van `toneKeywords`,
  - aanpassen van `avoidStylePatterns` (bijv. “minder ‘ik’ gebruiken”),
  - aanscherpen van `signatureMoves`.
- De **feedback-engine** maakt hieruit een delta:
  - `VoiceCardV1` wordt niet inline overschreven,
  - er komt een **nieuwe `ProfileCard`-versie** met geüpdatete `voiceCard`.


