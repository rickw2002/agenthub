type ExampleInput = {
  kind: "good" | "bad";
  content: string;
};

export function buildBlogGeneratorPrompt(args: {
  thought: string;
  length: "short" | "medium" | "long";
  profile: {
    voiceCard: unknown;
    audienceCard: unknown;
    offerCard: unknown;
    constraints: unknown;
  };
  examples: ExampleInput[];
  specVersion: "BlogSpecV1";
}) {
  const { thought, length, profile, examples } = args;

  const profileJson = JSON.stringify(profile, null, 2);
  const examplesJson = JSON.stringify(examples, null, 2);

  const system = `
Je bent een gespecialiseerde B2B-blogschrijver.

DOEL:
- Zet een ruwe gedachte van de gebruiker om in een inhoudelijke blogpost.
- Gebruik het meegegeven profiel (Voice, Audience, Offer, Constraints) en respecteer alle contentregels.

BLOG SPEC (BlogSpecV1):
- Structuur (impliciet, niet gelabeld in de tekst):
  - duidelijke introductie met probleem of observatie,
  - context en verdieping,
  - 2–4 concrete inzichten, argumenten of stappen,
  - zachte afsluiting (reflectie of lichte CTA).
- Stijl:
  - rustig, analytisch, inhoudelijk,
  - meer diepgang dan een LinkedIn-post,
  - geen hype, geen sales-push,
  - respecteer bannedPhrases, bannedTopics en CTA-stijl uit het profiel.
- Output:
  - alleen de uiteindelijke blogtekst als platte tekst,
  - geen headings of labels als "Intro", "Inzicht 1" enzovoort,
  - geen markdown, geen JSON, geen extra uitleg.
`.trim();

  const user = `
THOUGHT (ruwe input van gebruiker):
${thought}

GEWENSTE LENGTE:
- ${length}

PROFIEL (VoiceCard, AudienceCard, OfferCard, Constraints):
${profileJson}

VOORBEELDEN (good/bad):
${examplesJson}

OPDRACHT:
- Schrijf één blogartikel dat:
  - begint met een heldere introductie (waar gaat dit over, waarom nu?),
  - vervolgens de context en situatie van de doelgroep uitwerkt,
  - daarna 2–4 concrete inzichten, argumenten of stappen geeft,
  - en afsluit met een rustige reflectie of lichte CTA die past bij de CTA-stijl.
- Gebruik de tone of voice, doelgroepcontext en offer-informatie uit het profiel.
- Vermijd alle bannedPhrases en bannedTopics uit Constraints.
- Vermijd hype-taal en harde sales.
- Houd rekening met de gevraagde lengte-modus ("short", "medium" of "long").

BELANGRIJK:
- Geef ALLEEN de uiteindelijke blogtekst als platte tekst terug.
- GEEN extra uitleg, GEEN metadata, GEEN JSON, GEEN markdown.
`.trim();

  return { system, user };
}


