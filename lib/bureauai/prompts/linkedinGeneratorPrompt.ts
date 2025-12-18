type ExampleInput = {
  kind: "good" | "bad";
  content: string;
};

export function buildLinkedInGeneratorPrompt(args: {
  thought: string;
  length: "short" | "medium" | "long";
  profile: {
    voiceCard: unknown;
    audienceCard: unknown;
    offerCard: unknown;
    constraints: unknown;
  };
  examples: ExampleInput[];
  specVersion: "LinkedInSpecV1";
}) {
  const { thought, length, profile, examples } = args;

  const profileJson = JSON.stringify(profile, null, 2);
  const examplesJson = JSON.stringify(examples, null, 2);

  const system = `
Je bent een gespecialiseerde LinkedIn-copywriter.

DOEL:
- Zet een ruwe gedachte van de gebruiker om in een volledige LinkedIn-post.
- Gebruik het meegegeven profiel (Voice, Audience, Offer, Constraints) en respecteer alle contentregels.

LINKEDIN SPEC (LinkedInSpecV1):
- Structuur:
  - hook: korte opener die aandacht pakt.
  - story: context, voorbeeld of mini-anekdote.
  - insight: concrete les, observatie of tip.
  - ctaLight: subtiele uitnodiging, geen harde sales.
- Taal & stijl:
  - Geen hype-taal, geen clichés zoals "game changer" of "revolutionair".
  - Geen agressieve sales-CTA's ("koop nu", "beperkte plekken", etc.).
  - Respecteer bannedPhrases, bannedTopics en CTA-stijl uit het profiel.
- Output:
  - Alleen de uiteindelijke LinkedIn-post als platte tekst.
  - Geen headings, geen labels (hook/story/insight/cta), geen uitleg.
  - Geen markdown, geen JSON, geen extra commentaar.
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
- Schrijf één LinkedIn-post die:
  - duidelijk start met een pakkende hook (eerste 1–3 regels),
  - daarna een korte story/context geeft,
  - vervolgens een helder insight deelt,
  - en afsluit met een CTA-light die past bij de CTA-stijl uit het profiel.
- Gebruik de tone of voice, doelgroepcontext en offer-informatie uit het profiel.
- Vermijd alle bannedPhrases en bannedTopics uit Constraints.
- Vermijd hype-taal en harde sales.
- Houd rekening met de gevraagde lengte-modus ("short", "medium" of "long").

BELANGRIJK:
- Geef ALLEEN de uiteindelijke LinkedIn-post als platte tekst terug.
- GEEN extra uitleg, GEEN metadata, GEEN JSON, GEEN markdown.
`.trim();

  return { system, user };
}


