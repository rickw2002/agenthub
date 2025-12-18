## Bureau-AI – Profile Cards Spec (V1)

Deze spec definieert drie kern-cards die samen het gepersonaliseerde profiel vormen:

1. **AudienceCardV1** – voor **doelgroep & context**  
2. **OfferCardV1** – voor **aanbod & belofte**  
3. **ConstraintsV1** – voor **grenzen, no-go’s en CTA-stijl**

De daadwerkelijke Zod-schema’s leven in `lib/llm/schemas/*`,
maar deze spec is de inhoudelijke bron van waarheid.

---

## 1. AudienceCardV1

### 1.1 Purpose

De **Audience Card** beschrijft zo concreet mogelijk:

- wie we aanspreken (rollen, sector, bedrijfstypen),
- in welke context ze werken,
- welke doelen en struggles ze hebben,
- welke taal en invalshoeken bij hen passen.

Probleem dat dit oplost:

- LLM’s hebben de neiging om “iedereen” aan te spreken.
- AudienceCardV1 dwingt focus: **één duidelijke primaire doelgroep** per profiel.

### 1.2 Fields

**Type-naam:** `AudienceCardV1`  
**Opslag:** `ProfileCard.audienceCard` (JSONB)  

Velden:

- **`version`**: `string`
  - Altijd `"AudienceCardV1"` voor dit schema.

- **`segments`**: `{ label: string; description: string }[]`
  - 1–3 kernsegmenten binnen de doelgroep.
  - Voorbeeld-`label`: `"MKB-b2b-marketeers"`, `"ZZP-consultants"`.

- **`primaryRole`**: `string`
  - Typische functietitel of rol.
  - Voorbeeld: `"marketingmanager"`, `"freelance performance marketeer"`.

- **`companyProfile`**:
  - **`size`**: `"zzp" | "micro" | "mkb" | "corporate" | "mixed"`
  - **`industries`**: `string[]`
  - **`regions`**: `string[]`

- **`currentSituation`**: `string`
  - Beschrijving van hoe het nu gaat vóór samenwerking.
  - Gebaseerd op foundations-vragen: proces, tools, gewoontes, beperkingen.

- **`goals`**: `string[]`
  - 3–7 concrete doelen van de doelgroep.
  - Voorbeeld: `"meer kwalitatieve leads"`, `"minder afhankelijk zijn van agencies"`.

- **`challenges`**: `string[]`
  - 3–7 kernproblemen/pijnpunten, geformuleerd in doelgroep-taal.

- **`decisionDrivers`**: `string[]`
  - Factoren die bepalen waarom ze kiezen voor deze maker of dienst.
  - Voorbeeld: `"praktische voorbeelden uit vergelijkbare cases"`, `"nuchtere communicatie zonder hype"`.

- **`languageNotes`**: `string`
  - Hoe de doelgroep praat: jargon, niveau, tempo.
  - Voorbeeld: `"veel marketingtermen, maar houdt van concrete cijfers i.p.v. buzzwords"`.

### 1.3 JSON-voorbeeld

```json
{
  "version": "AudienceCardV1",
  "segments": [
    {
      "label": "MKB-b2b-marketeers",
      "description": "Marketeers in B2B MKB-bedrijven (10–150 FTE) die verantwoordelijk zijn voor leads en campagnes."
    },
    {
      "label": "Eigenaren van marketingbureaus",
      "description": "Bureau-eigenaren die hun klanten beter willen adviseren over performance en data."
    }
  ],
  "primaryRole": "marketingmanager / marketing lead",
  "companyProfile": {
    "size": "mkb",
    "industries": ["B2B-software", "dienstverlening", "consultancy"],
    "regions": ["Nederland", "Vlaanderen"]
  },
  "currentSituation": "Ze draaien al campagnes op Google en LinkedIn, maar sturen vooral op kliks en impressions. Dashboards zijn druk en niemand heeft tijd om diep in de data te duiken. Er is vaak afhankelijkheid van externe partners.",
  "goals": [
    "meer kwalitatieve leads i.p.v. alleen meer verkeer",
    "beter kunnen uitleggen aan directie wat marketing oplevert",
    "minder tijd kwijt zijn aan handmatig rapporteren",
    "meer grip op performance over kanalen heen"
  ],
  "challenges": [
    "weinig tijd om cijfers te analyseren",
    "moeilijk om data uit verschillende bronnen te combineren",
    "lastig om nuchter advies te krijgen zonder upsell-agenda",
    "organisatie begrijpt marketing-KPI’s niet goed"
  ],
  "decisionDrivers": [
    "heldere, nuchtere uitleg in normaal Nederlands",
    "praktische voorbeelden uit vergelijkbare B2B-cases",
    "geen dik strategisch verhaal maar concrete acties",
    "transparantie over wat wel en niet kan met hun budget"
  ],
  "languageNotes": "Ze gebruiken marketingtermen als CPL, ROAS en MQL, maar waarderen het als iemand dat in gewone mensentaal kan samenvatten. Geen hype-termen of 'growth hacking', liever nuchtere impact."
}
```

### 1.4 Gebruik

- **Generators**
  - Bepalen **perspectief en voorbeelden**:
    - Welke rol wordt aangesproken (marketingmanager, bureaubaas).
    - Welke situaties en voorbeelden logisch zijn (MKB, B2B, regio).
  - Helpt om:
    - irrelevante voorbeelden te vermijden (geen e-commerce dropshipping clichés),
    - concrete doelen en challenges in posts/blogs te verwerken.

- **Quality gate**
  - Checkt of:
    - de tekst **concreet genoeg is voor deze doelgroep**,
    - claims aansluiten bij de beschreven goals/challenges,
    - jargon passend is bij `languageNotes` (niet te technisch of te simplistisch).
  - Scoort posts lager als ze te generiek zijn (“ondernemers”, “iedereen die wil groeien”)
    terwijl AudienceCardV1 sterk gespecificeerd is.

- **Feedback updater**
  - Gebruikt feedback (bijv. “dit voelt te basic voor mijn doelgroep”) om:
    - `challenges`, `goals` of `segments` aan te scherpen,
    - `languageNotes` te verfijnen (meer/ minder jargon).
  - Leidt tot een **nieuwe ProfileCard-versie** met geüpdatete AudienceCard.

---

## 2. OfferCardV1

### 2.1 Purpose

De **Offer Card** beschrijft:

- welk aanbod centraal staat,
- welke resultaten het belooft,
- hoe het werkt (globaal),
- welke proof er is (cases, social proof),
- welke positionering het heeft.

Probleem dat dit oplost:

- LLM’s vervallen snel in vage voordelen (“meer omzet”, “beter resultaat”).
- OfferCardV1 dwingt **concrete, geloofwaardige value propositions**.

### 2.2 Fields

**Type-naam:** `OfferCardV1`  
**Opslag:** `ProfileCard.offerCard` (JSONB)  

Velden:

- **`version`**: `string`
  - `"OfferCardV1"`.

- **`coreOffer`**: `string`
  - 1–2 zinnen: wat het aanbod is en voor wie.

- **`problemNarrative`**: `string`
  - Beschrijving van het hoofdpijnprobleem dat dit aanbod oplost (in klantwoorden).

- **`promise`**: `string`
  - Heldere kernbelofte, zonder onrealistische claims.

- **`outcomes`**: `string[]`
  - 3–7 concrete resultaten die vaak gehaald worden.
  - Voorbeeld: `"beter inzicht in welke campagnes echt winstgevend zijn"`.

- **`beforeAfter`**:
  - **`before`**: `string`
  - **`after`**: `string`
  - Korte “voor/na”-schets in tekst.

- **`mechanism`**: `string`
  - Hoe het aanbod grofweg werkt (methodiek, aanpak).

- **`whoItIsFor`**: `string[]`
  - 3–5 bullets voor voor-wie-geschikt.

- **`whoItIsNotFor`**: `string[]`
  - 3–5 bullets voor waarvoor/voor wie het niet bedoeld is.

- **`differentiators`**: `string[]`
  - 3–7 punten die dit aanbod onderscheiden van alternatieven.

- **`pricePositioning`**: `"premium" | "boven_gemiddeld" | "midden" | "betaalbaar" | "budget" | "mixed"`

- **`proofPoints`**:
  - **`caseSnippets`**: `{ label: string; result: string; context: string }[]`
  - **`socialProof`**: `string[]` (bijv. quotes zonder namen of samenvattingen van reviews).

### 2.3 JSON-voorbeeld

```json
{
  "version": "OfferCardV1",
  "coreOffer": "Een maandelijkse performance-review voor je marketingkanalen, in gewoon Nederlands, inclusief concrete actiepunten voor de komende maand.",
  "problemNarrative": "Veel MKB-marketeers hebben dashboards vol cijfers, maar weinig tijd om er echt iets mee te doen. Rapportages van bureaus voelen vaak als verantwoording, niet als eerlijk advies. Er is behoefte aan een nuchtere tweede paar ogen dat zegt wat er echt toe doet.",
  "promise": "Elke maand helderheid over wat wel en niet werkt, en precies weten welke 2–3 dingen je nu moet aanpassen.",
  "outcomes": [
    "beter begrijpen waar budget weglekt",
    "sneller stoppen met campagnes die weinig bijdragen",
    "meer focus op de kanalen die écht kwalitatieve leads opleveren",
    "makkelijker rapporteren aan directie met een simpele samenvatting"
  ],
  "beforeAfter": {
    "before": "Je hebt een wildgroei aan rapportages en dashboards. Iedereen heeft een mening, maar niemand voelt zich echt zeker over de cijfers.",
    "after": "Je hebt één nuchter maandrapport met de kerninzichten en 2–3 concrete acties. Je weet welke getallen tellen en welke ruis zijn."
  },
  "mechanism": "We koppelen je bestaande advertentie- en analytics-accounts, halen de belangrijkste cijfers op en leggen ze naast je doelen. Vervolgens maak ik een menselijke analyse met context, zonder vakjargon, en vertaal dat naar prioriteiten voor de komende maand.",
  "whoItIsFor": [
    "MKB-b2b-bedrijven met lopende campagnes op Google, LinkedIn of Meta",
    "marketingmanagers die weinig tijd hebben om diep in de data te duiken",
    "bureaus die een sparringpartner willen voor hun eigen rapportages"
  ],
  "whoItIsNotFor": [
    "start-ups zonder lopende campagnes of meetbare data",
    "bedrijven die alleen eenmalig 'alles goed willen zetten' en daarna niets willen aanpassen",
    "teams die vooral op zoek zijn naar een uitvoerend bureau i.p.v. een denkkracht"
  ],
  "differentiators": [
    "nuchtere, eerlijke analyse zonder upsell-belang",
    "combinatie van cijfers én praktijkervaring met B2B-campagnes",
    "focus op 2–3 acties i.p.v. een lijst van 20 optimalisatiepunten",
    "rapporteert in normaal Nederlands, niet in agency-jargon"
  ],
  "pricePositioning": "boven_gemiddeld",
  "proofPoints": {
    "caseSnippets": [
      {
        "label": "B2B-softwarebedrijf (50 FTE)",
        "result": "20% minder advertentiebudget met gelijkblijvend aantal kwalitatieve demo-aanvragen na 3 maanden.",
        "context": "Herallocatie van budget op basis van nuchtere kanaalanalyse en het schrappen van campagnes met hoge CPL maar lage leadkwaliteit."
      },
      {
        "label": "Consultancy-bureau",
        "result": "Directieteam kreeg maandelijks een 1-pager in plaats van een 20-slides deck.",
        "context": "Focussen op 3 kern-KPI’s en een korte management-samenvatting."
      }
    ],
    "socialProof": [
      "“Eindelijk iemand die mijn cijfers uitlegt zonder buzzwords.”",
      "“De maandrapporten zorgen voor betere gesprekken met onze directie.”"
    ]
  }
}
```

### 2.4 Gebruik

- **Generators**
  - Bepalen **inhoudelijke focus**:
    - welke problemen, resultaten en beloftes in posts/blogs terugkomen,
    - welke cases en proof logisch zijn om te noemen.
  - Helpen om:
    - niet in generieke “meer omzet”-praat te vervallen,
    - posts te koppelen aan concrete uitkomsten (`outcomes`, `beforeAfter`).

- **Quality gate**
  - Checkt of:
    - beloftes in de output niet **buiten de kaders** van `promise` en `outcomes` vallen,
    - er geen onrealistische claims ontstaan die niet in `proofPoints` zijn verankerd,
    - `whoItIsNotFor` gerespecteerd wordt (geen tekst die het voor “iedereen” lijkt).
  - Duwt score omlaag als een post:
    - te vaag blijft over wat het aanbod oplevert,
    - of ineens een totaal ander aanbod suggereert.

- **Feedback updater**
  - Gebruikt feedback als:
    - “dit is te soft, het mag scherper over resultaten”,
    - “ik wil minder nadruk op budgetbesparing, meer op rust en overzicht”.
  - Past dan:
    - `outcomes`, `promise` of `differentiators` aan,
    - eventueel `whoItIsFor` / `whoItIsNotFor`.
  - Resultaat: nieuwe OfferCard-versie met betere market-fit.

---

## 3. ConstraintsV1

### 3.1 Purpose

De **Constraints Card** definieert harde en zachte grenzen:

- wat **mag absoluut niet** (woorden, claims, onderwerpen),
- hoe direct een CTA mag zijn,
- welke operationele beperkingen er zijn (frequentie, kanalen).

Probleem dat dit oplost:

- Zonder expliciete constraints gaan modellen snel “over de schreef”:
  - te salesy,
  - te veel clichés,
  - gevoelige of ongewenste onderwerpen.

### 3.2 Fields

**Type-naam:** `ConstraintsV1`  
**Opslag:** `ProfileCard.constraints` (JSONB)  

Velden:

- **`version`**: `string`
  - `"ConstraintsV1"`.

- **`bannedPhrases`**: `string[]`
  - Woorden/zinnen die nooit mogen voorkomen in outputs.
  - Inclusief generieke clichés én merk-specifieke no-go’s.

- **`bannedTopics`**: `string[]`
  - Onderwerpen/invalshoeken die vermeden moeten worden.
  - Bijv. politiek, crypto, snel rijk-schema’s, etc.

- **`legalComplianceNotes`**: `string`
  - Korte instructies over claims / disclaimers, indien relevant.

- **`ctaStyle`**:
  - **`level`**: `"heel_zacht" | "neutraal" | "duidelijk" | "sales_gericht"`
  - **`examples`**: `string[]`
  - **`bannedCtaPatterns`**: `string[]`

- **`toneHardLimits`**: `string[]`
  - Hard afgebakende stijlregels, bijv.:
  - `"geen jij/je, altijd u"`, `"geen zwart-wit uitspraken over succesgaranties"`.

- **`operational`**:
  - **`maxPostsPerWeek`**: `number | null`
  - **`avoidWeekdays`**: `string[]` (bijv. `["zaterdag", "zondag"]`)
  - **`notes`**: `string`
  - In V1 primair informatief; later bruikbaar voor planning/batching.

### 3.3 JSON-voorbeeld

```json
{
  "version": "ConstraintsV1",
  "bannedPhrases": [
    "game changer",
    "revolutionair",
    "10x",
    "sky is the limit",
    "crushing it",
    "hustle",
    "passief inkomen in je slaap"
  ],
  "bannedTopics": [
    "crypto-investeringen",
    "politieke statements",
    "gezondheidsclaims buiten marketingcontext"
  ],
  "legalComplianceNotes": "Geen harde omzet- of winstgaranties noemen. Formuleer resultaten als voorbeelden, niet als beloftes.",
  "ctaStyle": {
    "level": "neutraal",
    "examples": [
      "Benieuwd hoe dit er bij jullie uitziet? Stuur me gerust een bericht.",
      "Herkenbaar? Laat het weten in een reactie.",
      "Wil je hier eens rustig over sparren? Plan gerust een vrijblijvende call in."
    ],
    "bannedCtaPatterns": [
      "Nu kopen",
      "Beperkte plekken",
      "Nog maar X plekken beschikbaar",
      "FOMO-achtige urgentie zonder reden"
    ]
  },
  "toneHardLimits": [
    "geen overdreven hype-taal",
    "geen schreeuwerige hoofdletters (GEGARANDEERD, NU, SLECHTS)",
    "niet inspelen op angst of schaamte als primaire drijfveer"
  ],
  "operational": {
    "maxPostsPerWeek": 3,
    "avoidWeekdays": ["zaterdag", "zondag"],
    "notes": "Liever consistente aanwezigheid dan dagelijks posten. Geen zware salesposts vlak voor het weekend."
  }
}
```

### 3.4 Gebruik

- **Generators**
  - Filteren expliciet:
    - woorden uit `bannedPhrases`,
    - thema’s uit `bannedTopics`,
    - te harde CTA’s via `ctaStyle.bannedCtaPatterns`.
  - Kiezen CTA’s uit `ctaStyle.examples`, gecombineerd met VoiceCard/OfferCard.

- **Quality gate**
  - Hard check:
    - geen enkel woord uit `bannedPhrases` of `bannedCtaPatterns` mag voorkomen,
    - detectie van verboden topics (approx.; LLM-check).
  - Soft check:
    - alignment met `ctaStyle.level` en `toneHardLimits`.
  - Score gaat sterk omlaag bij overtreding; bij ernstige schending kan output worden afgekeurd.

- **Feedback updater**
  - Gebruikt feedback als:
    - “dit voelt nog steeds te salesy”,
    - “dit mag juist iets directer”.
  - Past dan:
    - `ctaStyle.level`, `bannedCtaPatterns`, mogelijk extra `bannedPhrases`,
    - of versoepelt constraints als de gebruiker dat expliciet wil.

---

## 4. Examples Policy (Mandatory for High Quality)

### 4.1 Minimum aantallen

Voor een goed werkende personalisatie-engine zijn **voorbeelden verplicht**:

- **Minimaal 3 goede voorbeelden** (`kind = "good"`)
- **Minimaal 2 slechte voorbeelden** (`kind = "bad"`)

Deze examples horen bij het profiel (workspace/project) en worden gebruikt door:

- **card-synthese**,
- **generatie**,
- **quality gate**.

### 4.2 Invloed op card-synthese

- De LLM die `AudienceCardV1`, `OfferCardV1`, `VoiceCardV1` en `ConstraintsV1` maakt:
  - gebruikt **good examples** om te zien:
    - welke type inhoud, toon en structuur wenselijk zijn,
    - hoe scherp de doelgroep en het aanbod in praktijk worden verwoord.
  - gebruikt **bad examples** om te leren:
    - welke formuleringen, invalshoeken of CTA’s juist níet gewenst zijn.
- Zo ontstaat een kardenset die niet alleen op vragen is gebaseerd,
  maar ook op **concrete output-voorbeelden**.

### 4.3 Invloed op generatie

- Tijdens generatie (LinkedIn / Blog) kunnen examples worden gebruikt als:
  - **stijlgids**: “schrijf meer zoals voorbeeld A en minder zoals voorbeeld B”.
  - **inhoudelijke referentie**: welke niveaudiepte, hoeveel context, hoeveel cijfers.
- Good examples:
  - sturen de generator richting gewenste lengte, scherpte, balans tussen verhaal en advies.
- Bad examples:
  - worden gebruikt als “anti-patronen”:
    - bijvoorbeeld te generiek, te salesy, te vaag, te cliché.

### 4.4 Invloed op quality gate

- De quality gate vergelijkt nieuwe outputs met:
  - **good examples**: lijken we meer op deze (positief),
  - **bad examples**: lijken we gevaarlijk veel op deze (negatief).
- Checks kunnen o.a. zijn:
  - overeenkomsten in structuur (teveel bullet-staketsel, te veel hype),
  - mate van concreetheid (meer zoals goede voorbeelden met cases, of zoals slechte voorbeelden met oppervlakkige tips),
  - voice & constraints-scheidslijn (passen we nog bij nuchtere, rustige stijl?).

### 4.5 Style examples vs content examples

Belangrijk onderscheid:

- **Style examples (voice)**:
  - focussen op toon, tempo, woordkeuze, zinsopbouw.
  - Kunnen over uiteenlopende onderwerpen gaan,
    zolang de **stem** representatief is.
  - Sterk gekoppeld aan **VoiceCardV1** en deels aan Constraints.

- **Content examples (structure/claims)**:
  - focussen op structuur en inhoud:
    - hoe wordt een probleem geïntroduceerd,
    - hoeveel context wordt er gegeven,
    - hoe concreet zijn claims en resultaten.
  - Sterk gekoppeld aan **AudienceCardV1** en **OfferCardV1**.

In de praktijk zal een voorbeeld vaak **beide** aspecten bevatten,
maar de engine kan expliciet vragen om:

- een paar voorbeelden die vooral “stem” laten zien,
- en een paar die vooral “inhoud & structuur” laten zien.

Beide categorieën zijn essentieel om:

- cards goed te synthetiseren,
- generatie te sturen,
- en de quality gate scherpe, concrete feedback te laten geven.


