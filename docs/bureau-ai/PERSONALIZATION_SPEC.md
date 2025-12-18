## Bureau-AI – Personalization Foundations Spec (V1)

Deze spec definieert de **vaste vragen** (foundations) voor de personalisatie-engine.
Elke vraag heeft een **stabiel `questionKey`**, zodat antwoorden en cards schema-veilig blijven.

De adaptive laag (LLM-planner) mag **alleen kiezen uit deze keys** en toekomstige uitbreidingen,
niet de semantiek van bestaande keys wijzigen.

### 1. Foundations-overzicht

Doel: in ±10–15 vragen genoeg context verzamelen om **voice, audience, offer en constraints** goed te kunnen afleiden.

#### 1.1 Structuur per vraag

- **questionKey**: stabiele machine key (dot-notatie).
- **questionText**: NL-vraag zoals de gebruiker die ziet.
- **answerType**: `text | select | multi | boolean`.
- **options** (optioneel): vaste lijst van strings voor `select`/`multi`.
- **required**: of het een kernvraag is voor de eerste versie van het profiel.
- **channelImpact**: welke kanalen/modes deze vraag vooral raken.
- **profileMapping**: welke card(s) deze vraag voedt.
- **guidance** (kort): hulptekst voor de UI.

### 2. Vaste vragen (V1)

> Let op: deze lijst is **orde-onafhankelijk**; de wizard bepaalt de volgorde
> (eerst foundations, daarna adaptive verdiepingen).

#### 2.1 Doelgroep & probleem (audience/offer)

1. **foundations.target_audience**
   - **questionText**: Voor wie maak je vooral content? Beschrijf je ideale doelgroep zo concreet mogelijk.
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `AudienceCardV1.coreDescription`
   - **guidance**: Denk aan functietitel, sector, bedrijfsgrootte, niveau, typische context.

2. **foundations.main_problem**
   - **questionText**: Welk hoofdpijnprobleem los je op voor je doelgroep?
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `OfferCardV1.problemNarrative`
   - **guidance**: Formuleer in de woorden van je klant, niet in jouw vakjargon.

3. **foundations.current_situation**
   - **questionText**: Hoe ziet de huidige situatie van je ideale klant eruit (voor ze met jou werken)?
   - **answerType**: `text`
   - **required**: false
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `AudienceCardV1.context`, `OfferCardV1.beforeAfter`
   - **guidance**: Denk aan typische fouten, gewoontes, tools, processen.

4. **foundations.desired_outcome**
   - **questionText**: Wat is de gewenste uitkomst / resultaten waar je klanten voor bij jou komen?
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `OfferCardV1.promise`, `OfferCardV1.outcomes`
   - **guidance**: Concreet maken: tijd, geld, rust, omzet, kwaliteit, etc.

#### 2.2 Positionering & aanbod (offer)

5. **foundations.main_offer**
   - **questionText**: Wat is je belangrijkste aanbod of product waar je nu aandacht op wilt?
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `OfferCardV1.coreOffer`
   - **guidance**: 1–2 zinnen: wat het is, voor wie, in grote lijnen hoe het werkt.

6. **foundations.differentiator**
   - **questionText**: Wat maakt jouw aanpak anders dan alternatieven of concurrenten?
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `OfferCardV1.differentiators`
   - **guidance**: Focus op 2–3 concrete punten, geen vage “betere service”.

7. **foundations.price_positioning**
   - **questionText**: Hoe positioneer je jezelf qua prijs en waarde (bijv. premium, midden, budget)?
   - **answerType**: `select`
   - **options**: `["premium", "boven gemiddeld", "midden", "betaalbaar", "budget"]`
   - **required**: false
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `OfferCardV1.pricePositioning`
   - **guidance**: Helpt om toon en voorbeelden aan te passen (bijv. meer high-end vs pragmatisch).

#### 2.3 Stem / stijl (voice)

8. **foundations.tone_keywords**
   - **questionText**: Hoe zou je je toon omschrijven in 3–5 woorden? (bijv. “direct”, “speels”, “nuchter”)
   - **answerType**: `text`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `VoiceCardV1.toneKeywords`
   - **guidance**: Kort lijstje, gescheiden door komma’s of in een zin.

9. **foundations.formality_level**
   - **questionText**: Hoe formeel wil je klinken?
   - **answerType**: `select`
   - **options**: `["zeer informeel", "informeel", "neutraal", "formeel", "zeer formeel"]`
   - **required**: true
   - **channelImpact**: `["linkedin", "blog"]`
   - **profileMapping**: `VoiceCardV1.formality`
   - **guidance**: Dit bepaalt o.a. jij/je vs u, en hoe strak de zinnen zijn.

10. **foundations.persona_role**
    - **questionText**: Vanuit welke “rol” wil je vooral communiceren? (bijv. expert, mentor, maker, directeur)
    - **answerType**: `text`
    - **required**: false
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `VoiceCardV1.rolePersona`
    - **guidance**: Dit stuurt perspectief: “ik als … zie dat …”.

11. **foundations.nl_or_english**
    - **questionText**: In welke taal(en) wil je primair publiceren?
    - **answerType**: `multi`
    - **options**: `["Nederlands", "Engels", "Nederlands + Engels"]`
    - **required**: true
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `VoiceCardV1.languages`
    - **guidance**: Voor nu sturen we alleen de taalkeuze; echte meertaligheid is een latere fase.

#### 2.4 Constraints & no-go’s

12. **foundations.banned_phrases**
    - **questionText**: Zijn er woorden, termen of clichés die we absoluut nooit mogen gebruiken?
    - **answerType**: `text`
    - **required**: true
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `ConstraintsV1.bannedPhrases`
    - **guidance**: Bijv. “game changer”, “revolutionair”, “sky is the limit”; ook merkspecifieke no-go’s.

13. **foundations.topics_to_avoid**
    - **questionText**: Zijn er onderwerpen of invalshoeken die je liever vermijdt?
    - **answerType**: `text`
    - **required**: false
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `ConstraintsV1.bannedTopics`
    - **guidance**: Bijv. politiek, crypto, bepaalde methodes waar je niet achter staat.

14. **foundations.call_to_action_style**
    - **questionText**: Hoe direct mag een call-to-action zijn? (bijv. “heel zacht”, “neutraal”, “duidelijk”)
    - **answerType**: `select`
    - **options**: `["heel zacht", "neutraal", "duidelijk", "sterk sales-gericht"]`
    - **required**: true
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `ConstraintsV1.ctaStyle`
    - **guidance**: Stuurt de “CTA-light” tone in LinkedIn en de afsluitingen van blogs.

15. **foundations.time_constraints**
    - **questionText**: Zijn er praktische beperkingen waar we rekening mee moeten houden? (bijv. max aantal posts/week, geen weekends)
    - **answerType**: `text`
    - **required**: false
    - **channelImpact**: `["linkedin", "blog"]`
    - **profileMapping**: `ConstraintsV1.operational`
    - **guidance**: Wordt in V1 vooral gebruikt voor suggesties, later voor planning/batching.

### 3. Gebruik door de engine

- **ProfileAnswer**:
  - Slaat per `questionKey` de **ruwe antwoorden** op (text + optionele `answerJson`).
- **ProfileState**:
  - Houdt bij welke `questionKey`s beantwoord zijn (`knownKeys`) en welke nog missen (`missingKeys`).
  - `confidenceScore` is een samenvatting van de dekkingsgraad over deze foundations.
- **CardSynthesizer**:
  - Leest antwoorden voor bovenstaande keys en syntht deze naar:
    - `VoiceCardV1`, `AudienceCardV1`, `OfferCardV1`, `ConstraintsV1`.

### 4. Uitbreiding / versiebeheer

- Deze V1 mag in de toekomst worden uitgebreid met:
  - extra `foundations.*`-keys (nieuwe vragen),
  - fijnmaziger mapping naar cards,
  - kanaalspecifieke verdiepingsvragen (`linkedin.*`, `blog.*`).
- Bestaande `questionKey`s en hun basisbetekenis mogen **niet breken**:
  - herformuleren van `questionText` is oké,
  - maar `answerType` en kernbetekenis moeten stabiel blijven voor achterwaartse compatibiliteit.


