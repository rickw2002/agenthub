## Bureau-AI – Channel Specs (V1)

Deze spec definieert de **kanaalspecifieke regels** voor contentgeneratie.
In V1 richten we ons op:

- `LinkedInSpecV1`
- `BlogSpecV1`

De daadwerkelijke TypeScript-interfaces leven in `lib/engine/channelSpecs/*`,
maar deze file is de inhoudelijke bron van waarheid.

---

## 1. LinkedInSpecV1

### 1.1 Doel

Contract voor LinkedIn-posts, met focus op:

- **Thought → Post**: een ruwe gedachte omzetten naar een concrete post.
- Rustige maar duidelijke stijl, zonder marketing-hype.
- Consistente structuur + lengteprofiel.

### 1.2 Structuur

**Type-naam:** `LinkedInSpecV1`  
**Gebruik:** meegegeven aan generator + quality gate.

Belangrijkste velden:

- **`version`**: `"LinkedInSpecV1"`
- **`sections`**:
  - **`hook`**: korte opener die aandacht pakt.
  - **`story`**: context, voorbeeld, mini-anekdote.
  - **`insight`**: concrete les, observatie of tip.
  - **`ctaLight`**: subtiele uitnodiging (geen harde sales pitch).
- **`length`**:
  - **`mode`**: `"short" | "medium" | "long"`
  - **`targetChars`**: `number` (bij benadering; geen harde limiet).
  - Richtlijnen:
    - `short`: ± 400–700 tekens
    - `medium`: ± 700–1.300 tekens
    - `long`: ± 1.300–2.000 tekens
- **`formatting`**:
  - **`maxEmoji`**: `number` (globaal per post; typisch 0–3).
  - **`maxBullets`**: `number` (per lijst, típisch max 5).
  - **`maxHashtags`**: `number` (bijv. 3–5).
  - **`allowLineBreaks`**: `boolean` (ja).
  - **`paragraphPolicy`**: `"korte_blokken" | "gemengd"` (geen enorme text walls).
- **`bannedCliches`**: `string[]`
  - Minimum set, bijv.:
    - `"game changer"`, `"revolutionair"`, `"10x"`, `"sky is the limit"`,
    - `"crushing it"`, `"grind"`, `"hustle culture"`.
- **`contentRules`**:
  - **`avoidVagueClaims`**: `boolean`
  - **`explainJargon`**: `boolean`
  - **`focusOnConcreteExamples`**: `boolean`
  - **`ctaLightExamples`**: `string[]`
    - Bijv. `"Benieuwd hoe jij dit aanpakt?"`, `"Laat het weten in een reactie."`,
      `"Wil je hier dieper op in? Stuur me gerust een bericht."`.

### 1.3 Gedragsregels voor generator

- Elke LinkedIn-post moet (idealiter) herkenbaar zijn aan:
  - **Hook**: 1–3 regels, geen clickbait, wel duidelijk probleem of haakje.
  - **Story**: 1–3 korte alinea’s, met bij voorkeur 1 concreet voorbeeld.
  - **Insight**: 1–2 alinea’s waarin de les duidelijk wordt gemaakt.
  - **CTA-light**: 1–2 zinnen, geen harde sales.
- De generator:
  - Respecteert `bannedCliches` en vervangt ze door concretere formuleringen.
  - Past `formatting` aan i.c.m. VoiceCard + Constraints (emoji, bullets, hashtags).
  - Houdt rekening met lengte-modus, maar kiest **kwaliteit boven exacte lengte**.

### 1.4 Gedragsregels voor quality gate

De quality gate gebruikt `LinkedInSpecV1` om o.a. te beoordelen:

- **Structuur**:
  - Zijn er duidelijke delen die overeenkomen met hook / story / insight / CTA?
- **Banned patterns**:
  - Komt één van de `bannedCliches` of Constraints-banned phrases voor?
- **Vage claims**:
  - Te veel ononderbouwde superlatieven (zonder voorbeeld)?
- **Formatting**:
  - Overschrijdt de tekst de limieten voor emoji/bullets/hashtags?
  - Zijn alinea’s leesbaar (geen massive block)?
- **CTA-fit**:
  - Is de afsluiting **licht**, passend bij `call_to_action_style` en `ctaLightExamples`?

De gate geeft een **score (0–1)** en concrete suggesties terug,
inclusief een indicatie of het vooral een **structureel**, **voice** of **spec-fit** probleem is.

---

## 2. BlogSpecV1

### 2.1 Doel

Contract voor blogartikelen met:

- Heldere structuur (H2/H3),
- voldoende diepgang,
- focus op praktische toepasbaarheid,
- basis-SEO-vereisten.

### 2.2 Structuur

**Type-naam:** `BlogSpecV1`  
**Gebruik:** wordt gebruikt door de bloggenerator én quality gate.

Belangrijkste velden:

- **`version`**: `"BlogSpecV1"`
- **`layout`**:
  - **`requiresTitle`**: `true`
  - **`requiresMetaDescription`**: `true`
  - **`minH2Sections`**: `number` (bijv. 3)
  - **`maxH2Sections`**: `number` (bijv. 7)
  - **`allowH3`**: `true`
  - **`introPolicy`**: `"korte_intro"` (max ~200–250 woorden).
- **`length`**:
  - **`targetWords`**: `number` (bijv. 1.200–2.000 woorden als range).
  - **`minWords`**: `number`
  - **`maxWords`**: `number`
- **`seo`**:
  - **`requiresPrimaryKeyword`**: `boolean`
  - **`keywordUsageGuidelines`**: `string[]`
    - Bijv. `"verwerk het keyword in titel"`, `"verwerk het keyword in minimaal één H2"`, `"verwerk het keyword in meta description"`.
  - **`internalLinksRecommended`**: `boolean`
- **`sections`**:
  - **`outlineRequired`**: `boolean` (true)
  - **`outlineDepth`**: `"H2_only" | "H2_H3"`
  - **`recommendedSections`**: `string[]`
    - Bijv. `"Probleemschets"`, `"Waarom dit belangrijk is"`,
      `"Concrete stappen"`, `"Veelgemaakte fouten"`, `"Samenvatting"`.

### 2.3 Titelopties en meta

Bloggeneratie in V1 moet altijd minimaal leveren:

- **`titleOptions`**: `string[]` (bijv. 3–5 varianten).
- **`selectedTitle`**: `string`
- **`metaDescription`**: `string` (± 120–160 tekens, geen clickbait, wel concreet).
- **`outline`**: gestructureerde weergave van H2/H3’s.

### 2.4 Gedragsregels voor generator

- Generator moet:
  - Eerst een **outline** genereren volgens `sections` + Voice/Audience/Offer.
  - Daarna de tekst per sectie uitwerken, met oog op:
    - praktische voorbeelden,
    - concrete stappen waar mogelijk,
    - aansluiting op de doelgroep (AudienceCardV1),
    - consistentie met VoiceCardV1.
  - Basis-SEO volgen zonder “SEO keyword stuffing”.

### 2.5 Gedragsregels voor quality gate

De quality gate gebruikt `BlogSpecV1` om te checken:

- **Structuur**:
  - Zijn er genoeg H2’s?
  - Is de introductie niet te lang?
  - Zijn H3’s logisch genest onder H2’s?
- **Inhoudsdiepte**:
  - Bevat de tekst voldoende voorbeelden en uitleg,
    of blijft het te algemeen/vag?
- **SEO-basis**:
  - Bevat de tekst een fatsoenlijke meta description?
  - Wordt de primaire zoekterm op natuurlijke wijze gebruikt
    (zonder overkill)?
- **Voice & constraints**:
  - Sluit de stijl aan bij VoiceCard + Constraints?

Net als bij LinkedIn geeft de gate een **score (0–1)** en concrete verbeter-suggesties terug.

---

## 3. Versiebeheer en uitbreidingen

- Beide specs hebben een eigen `version`-veld:
  - `"LinkedInSpecV1"`, `"BlogSpecV1"`.
- Toekomstige breaking changes:
  - leiden tot nieuwe versies (`LinkedInSpecV2`, `BlogSpecV2`),
  - generators en outputs loggen **welke spec-versie** is gebruikt.
- Niet-breaking uitbreidingen:
  - nieuwe niet-verplichte velden,
  - extra `bannedCliches`,
  - fijnmazigere `contentRules`.


