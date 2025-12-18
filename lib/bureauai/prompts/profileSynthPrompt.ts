type FoundationAnswer = {
  questionKey: string;
  answerText: string;
  answerJson?: unknown | null;
};

type ExampleInput = {
  kind: "good" | "bad";
  content: string;
  notes?: string | null;
};

type PreviousCardsInput =
  | {
      voiceCard: unknown;
      audienceCard: unknown;
      offerCard: unknown;
      constraints: unknown;
    }
  | null;

export function buildProfileSynthesisPrompt(args: {
  foundations: FoundationAnswer[];
  examples: ExampleInput[];
  previousCards: PreviousCardsInput;
}) {
  const { foundations, examples, previousCards } = args;

  const foundationsJson = JSON.stringify(foundations, null, 2);
  const examplesJson = JSON.stringify(examples, null, 2);
  const previousCardsJson = previousCards
    ? JSON.stringify(previousCards, null, 2)
    : "null";

  const system = `
Je bent een senior branding- en copy-expert die een gestructureerd profiel samenstelt voor LinkedIn- en blogcontent.

JE TAAK:
- Synthesiseer op basis van input:
  - één VoiceCardV1,
  - één AudienceCardV1,
  - één OfferCardV1,
  - één ConstraintsV1.

BELANGRIJK:
- Houd je strikt aan de bestaande velden per card zoals gespecificeerd (VoiceCardV1, AudienceCardV1, OfferCardV1, ConstraintsV1).
- Voeg GEEN extra velden toe.
- Verwijder geen verplichte velden.
- Gebruik alleen JSON types die passen bij de velden (strings, booleans, numbers, arrays, objecten).
- Je output moet UITSLUITEND bestaan uit één JSON-object met precies deze vier keys:
  {
    "voiceCard": { ... },
    "audienceCard": { ... },
    "offerCard": { ... },
    "constraints": { ... }
  }
- GEEN markdown, GEEN uitleg, GEEN tekst buiten dit JSON-object.

KORTE HERINNERING PER CARD (SAMENVATTING):
- VoiceCardV1: toon, formality, energy, rol/persona, schrijfstijl (zinnen, bullets, emoji), taal en aanspreekvorm, do's & don'ts, voorbeeldfragmenten.
- AudienceCardV1: doelgroepsegmenten, primaire rol, type bedrijven, huidige situatie, doelen, uitdagingen, beslisfactoren, taalnotities.
- OfferCardV1: kernaanbod, probleemverhaal, belofte, concrete outcomes, voor/na, mechanisme, wie wel/niet, differentiators, prijspositionering, proof points.
- ConstraintsV1: banned phrases, banned topics, juridische/claim-notities, CTA-stijl (niveau + voorbeelden + verboden CTA-patronen), harde toon-limieten, operationele beperkingen.
`.trim();

  const user = `
Je krijgt hieronder de volledige context:

1) FOUNDATIONS-ANTWOORDEN (per vraag):
${foundationsJson}

2) VOORBEELDEN (examples) met type "good" of "bad":
${examplesJson}

3) EERDERE CARDS (optioneel, voor continuïteit):
${previousCardsJson}

OPDRACHT:
- Lees eerst de foundations-answers goed door.
- Gebruik de good examples als gewenste richting, en de bad examples als anti-patronen.
- Gebruik eerdere cards alleen als extra context; corrigeer of scherper maken mag.

GENEREER:
- Eén JSON-object met exact deze structuur:
{
  "voiceCard": { ... },
  "audienceCard": { ... },
  "offerCard": { ... },
  "constraints": { ... }
}

REGELS:
- Geen extra top-level keys.
- Geen velden met null als dat niet nodig is; laat optionele velden eventueel weg of gebruik lege arrays.
- Stem VoiceCardV1, AudienceCardV1, OfferCardV1 en ConstraintsV1 goed op elkaar af.
- Houd rekening met nuchtere, rustige, niet-hyperbolische toon als dat uit de input blijkt.
`.trim();

  return { system, user };
}


