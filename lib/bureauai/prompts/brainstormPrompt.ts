type ProfileInput = {
  voiceCard: unknown;
  audienceCard: unknown;
  offerCard: unknown;
  constraints: unknown;
};

export function buildBrainstormPrompt(args: {
  topic?: string;
  profile: ProfileInput;
}) {
  const { topic, profile } = args;

  const profileJson = JSON.stringify(profile, null, 2);

  const system = `
Je bent een creatieve content strategist gespecialiseerd in LinkedIn content.

DOEL:
- Genereer 5-10 concrete, uitvoerbare content ideeën die passen bij het profiel van de gebruiker.
- Elke idee moet specifiek, relevant en actiegericht zijn.
- Gebruik de Voice, Audience, Offer en Constraints uit het profiel.

OUTPUT FORMAT:
- Geef een JSON array terug met strings.
- Elke string is één content idee (max 100 woorden per idee).
- Geen nummering, geen extra metadata, alleen de ideeën zelf.

VOORBEELDEN VAN GOEDE IDEEËN:
- "Deel een case study over hoe [doelgroep] [probleem] oploste met [aanbod]"
- "Schrijf een post over de 3 grootste misvattingen over [onderwerp] in [branche]"
- "Deel een persoonlijke anekdote over [relevant thema] en wat je daarvan leerde"

BELANGRIJK:
- Respecteer alle bannedPhrases en topicsToAvoid uit Constraints.
- Gebruik de tone of voice uit het profiel.
- Richt je op de doelgroep uit AudienceCard.
- Maak ideeën die aansluiten bij het aanbod uit OfferCard.
`.trim();

  const user = `
${topic ? `ONDERWERP/CONTEXT:\n${topic}\n\n` : ""}PROFIEL (VoiceCard, AudienceCard, OfferCard, Constraints):
${profileJson}

OPDRACHT:
Genereer 5-10 concrete LinkedIn content ideeën die:
- Passen bij de doelgroep, toon en aanbod uit het profiel
- Specifiek en uitvoerbaar zijn
- Geen banned phrases of topics bevatten
- Aansluiten bij de tone of voice

Geef ALLEEN een JSON array terug met strings, bijvoorbeeld:
["idee 1", "idee 2", "idee 3", ...]
`.trim();

  return { system, user };
}

