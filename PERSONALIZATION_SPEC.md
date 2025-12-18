## Bureau-AI Personalization Spec (v1)

Korte, nuchtere beschrijving van hoe Bureau-AI een profiel opbouwt en gebruikt voor contentgeneratie. Dit document is leidend voor de engine-laag en de UI-wizard.

---

### 1. Doel

- **Eén centraal profiel per workspace/project** dat:
  - De schrijfstijl (**Voice**) vastlegt.
  - De doelgroep (**Audience**) scherp maakt.
  - Het aanbod en positionering (**Offer**) verduidelijkt.
  - Belangrijke grenzen en voorkeuren (**Constraints**) bewaakt.
- Dit profiel wordt gebruikt door:
  - **LinkedIn-generator** (eerste kanaal).
  - **Quality gate** (beoordeling & herschrijving).
  - **Feedback-loop** (updates op basis van ratings).

---

### 2. Conceptuele bouwblokken

- **ProfileAnswer**
  - Fijngranulaire antwoorden op vragen uit de wizard (per `questionKey`).
  - Kan tekst of gestructureerde JSON zijn.
  - Bestaat per workspace en optioneel per project.

- **ProfileCard**
  - Geaggregeerde, samengevatte weergave van het profiel in vier kaarten:
    - `voiceCard`
    - `audienceCard`
    - `offerCard`
    - `constraints`
  - Wordt periodiek of op verzoek gesynthetiseerd uit `ProfileAnswer` + `Example` + feedback.

- **Example**
  - Concrete voorbeelden van goede/slechte content van de gebruiker.
  - Helpt de generator om “zo klinkt het wél / zo klinkt het níet” te leren.

- **Output & Feedback**
  - Elke gegenereerde post (`Output`) krijgt optioneel feedback (`Feedback`).
  - De feedback wordt vertaald naar een profiel-update (nieuwe versie van `ProfileCard`).

---

### 3. Vraagmodel (ProfileAnswer)

De wizard stelt in kleine, rustige stappen vragen. Elke vraag heeft:

- `questionKey`: stabiele technische sleutel.
- `questionText`: copy in UI, kan evolueren zonder dat het model breekt.
- `answerType`: `"text" | "select" | "multi" | "boolean"`.
- `options`: alleen bij select/multi.

#### 3.1 Kernvragen Voice (toon & stijl)

1. **`voice_identity_short`**
   - **Vraag**: “Hoe zou je jezelf of je bedrijf in één zin voorstellen op een borrel?”
   - **Type**: `text`
   - **Doel**: Korte, menselijke elevator pitch.

2. **`voice_formality`**
   - **Vraag**: “Welke toon past het beste bij je posts?”
   - **Type**: `select`
   - **Options**: `["informeel", "neutraal", "zakelijk"]`

3. **`voice_personality_keywords`**
   - **Vraag**: “Kies 3 woorden die bij jouw toon passen.”
   - **Type**: `multi`
   - **Options** (voorbeeld): `["nuchter", "eerlijk", "speels", "serieus", "direct", "zorgzaam", "analytisch"]`

4. **`voice_do_not_sound_like`**
   - **Vraag**: “Hoe wil je vooral níet klinken? (bv. ‘schreeuwerige marketing’).”
   - **Type**: `text`

#### 3.2 Kernvragen Audience (doelgroep)

5. **`audience_segment`**
   - **Vraag**: “Voor wie schrijf je vooral op LinkedIn?”
   - **Type**: `text`
   - **Voorbeeld**: “Eigenaren van kleine bureaus in marketing/advies.”

6. **`audience_stage`**
   - **Vraag**: “In welke fase zit je ideale klant meestal?”
   - **Type**: `select`
   - **Options**: `["net gestart", "groeiend", "gesetteld", "gemengd"]`

7. **`audience_pains`**
   - **Vraag**: “Wat zijn 2–3 terugkerende problemen van je doelgroep?”
   - **Type**: `text`

#### 3.3 Kernvragen Offer (aanbod & positionering)

8. **`offer_core_services`**
   - **Vraag**: “Welke diensten/producten wil je via LinkedIn onder de aandacht brengen?”
   - **Type**: `text`

9. **`offer_differentiator`**
   - **Vraag**: “Wat maakt jou anders dan alternatieven?”
   - **Type**: `text`

10. **`offer_price_positioning`**
    - **Vraag**: “Hoe positioneer je jezelf qua prijs?”
    - **Type**: `select`
    - **Options**: `["budget", "gemiddeld", "premium", "verschilt per klant"]`

#### 3.4 Kernvragen Constraints (grenzen & voorkeuren)

11. **`constraints_topics_off_limits`**
    - **Vraag**: “Zijn er onderwerpen waar je níet over wilt posten?”
    - **Type**: `text`

12. **`constraints_confidentiality`**
    - **Vraag**: “Wil je dat de tool nooit echte klantnamen/verhalen gebruikt zonder anonimisering?”
    - **Type**: `boolean`

13. **`constraints_time_per_post`**
    - **Vraag**: “Hoeveel tijd wil je gemiddeld kwijt zijn aan het finetunen van een post?”
    - **Type**: `select`
    - **Options**: `["< 5 minuten", "5–10 minuten", "meer dan 10 minuten"]`

#### 3.5 Examples (optioneel, maar sterk aanbevolen)

14. **`example_good_post_url_or_text`**
    - **Vraag**: “Plak een voorbeeld van een post waar je blij mee bent (mag van jezelf of iemand anders zijn).”
    - **Type**: `text`

15. **`example_bad_post_url_or_text`**
    - **Vraag**: “Plak een post waarvan je denkt: zo wil ik níet klinken.”
    - **Type**: `text`

Deze laatste twee leiden in de backend tot `Example`-records met `kind = "good" | "bad"`.

---

### 4. ProfileCards structuur (conceptueel)

`ProfileCard` bevat een `version` en vier JSON-kaarten die in TypeScript als strongly-typed objecten worden gemodelleerd, maar in de database als string (JSON) worden opgeslagen.

**4.1 VoiceCard**

Voorbeeldschema (TypeScript):

```ts
type VoiceCard = {
  summary: string; // 1–3 zinnen over toon en persoonlijkheid
  formality: "informeel" | "neutraal" | "zakelijk";
  personalityKeywords: string[];
  avoidStyles: string[];
};
```

**4.2 AudienceCard**

```ts
type AudienceCard = {
  primarySegment: string;
  stage: "net gestart" | "groeiend" | "gesetteld" | "gemengd";
  keyPains: string[];
};
```

**4.3 OfferCard**

```ts
type OfferCard = {
  coreServices: string[];
  differentiator: string;
  pricePositioning: "budget" | "gemiddeld" | "premium" | "verschilt per klant";
};
```

**4.4 ConstraintsCard**

```ts
type ConstraintsCard = {
  topicsOffLimits: string[];
  useRealClientNames: boolean; // false = altijd anonimiseren
  expectedEditTimePerPost: "< 5 minuten" | "5–10 minuten" | "meer dan 10 minuten";
};
```

In de database worden deze objecten als geserialiseerde JSON-strings opgeslagen in `ProfileCard.voiceCard`, `audienceCard`, `offerCard` en `constraints`.

---

### 5. Versies & scope (workspace vs project)

- **Scope:**
  - `workspaceId`: basisprofiel voor de hele workspace.
  - `projectId`: optionele overrides per project (bijv. apart aanbod of andere doelgroep).
  - Per `questionKey` is er maximaal één actief antwoord per `(workspaceId, projectId | null)`.
- **Versies:**
  - `ProfileAnswer` zelf is niet versie-gebaseerd, enkel de kaarten.
  - `ProfileCard.version` wordt verhoogd bij elke succesvolle synthese (via `/api/profile/synthesize`).
  - `Feedback` op `Output` kan leiden tot een nieuwe versie in `ProfileCard`.

---

### 6. Gebruik in de engine

- **nextQuestionPlanner**
  - Bepaalt op basis van ontbrekende `ProfileAnswer` records wat de volgende vraag is.
  - Houdt de flow licht voor ADHD-vriendelijke UX: max 1 vraag per stap, duidelijke voortgang.

- **cardSynthesizer**
  - Leest alle relevante `ProfileAnswer` + `Example` + recente `Feedback`.
  - Maakt/actualiseert een `ProfileCard`-record met nieuwe `version`.

- **linkedinGenerator**
  - Gebruikt het huidige `ProfileCard` (of fallback op ruwe `ProfileAnswer` als er nog geen cards zijn).
  - Combineert `thought` + `mode` + `length` + profiel om een post te genereren.

- **qualityGate**
  - Beoordeelt een gegenereerde post op:
    - Alignement met Voice/Audience/Offer/Constraints.
    - Helderheid, concreetheid, ruis.
  - Geeft een `quality`-object terug (score, reasoning, suggestions).

- **feedbackUpdater**
  - Neemt `Feedback` op een `Output` en vertaalt dit naar:
    - Kleine tekstuele deltas in de profielkaarten.
    - Een nieuwe `ProfileCard.version`.

---

### 7. UX-principes voor de wizard

- **Rustig & lineair**:
  - Nooit meer dan één vraag tegelijk in beeld.
  - Eenvoudige copy, weinig technische termen.
- **Opslaan per stap**:
  - Elke submit is een `POST /api/profile/answer` voor losse antwoorden.
  - Geen grote formulieren met risico op “alles kwijt”.
- **Altijd skip-mogelijkheid**:
  - Gebruiker kan vragen overslaan; planner komt er later op terug.
  - Engine moet ook met een halfgevuld profiel nuttige output geven.

Dit is v1 van de spec. Kleine uitbreidingen zijn toegestaan, maar de kern (Voice, Audience, Offer, Constraints, Examples) blijft stabiel.


