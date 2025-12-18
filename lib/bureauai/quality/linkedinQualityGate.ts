type LinkedInSpecV1 = {
  version: "LinkedInSpecV1";
  bannedCliches: string[];
};

type ConstraintsLike = {
  bannedPhrases?: string[];
  bannedTopics?: string[];
  ctaStyle?: {
    level?: string;
    bannedCtaPatterns?: string[];
  };
  toneHardLimits?: string[];
};

export type LinkedInQualityResult = {
  score: number;
  issues: string[];
  suggestions: string[];
  violatedConstraints: string[];
};

export const LINKEDIN_SPEC_V1: LinkedInSpecV1 = {
  version: "LinkedInSpecV1",
  bannedCliches: [
    "game changer",
    "revolutionair",
    "10x",
    "sky is the limit",
    "crushing it",
    "hustle",
  ],
};

const HYPE_PATTERNS = [
  "revolutionair",
  "game changer",
  "10x",
  "sky is the limit",
  "crushing it",
  "gegarandeerd succes",
  "passief inkomen in je slaap",
];

const SALESY_CTA_PATTERNS = [
  "koop nu",
  "nu kopen",
  "beperkte plekken",
  "nog maar",
  "meld je nu aan",
  "schrijf je nu in",
];

export function evaluateLinkedInQuality(args: {
  text: string;
  spec: LinkedInSpecV1;
  voiceCard: unknown;
  constraints: ConstraintsLike;
}): LinkedInQualityResult {
  const { text, spec, constraints } = args;
  const lower = text.toLowerCase();

  const issues: string[] = [];
  const suggestions: string[] = [];
  const violatedConstraints: string[] = [];

  const bannedPhrases = (constraints.bannedPhrases ?? []).map((s) =>
    s.toLowerCase()
  );
  const bannedTopics = (constraints.bannedTopics ?? []).map((s) =>
    s.toLowerCase()
  );
  const bannedCtaPatterns = (
    constraints.ctaStyle?.bannedCtaPatterns ?? SALESY_CTA_PATTERNS
  ).map((s) => s.toLowerCase());

  // Hard constraint: banned phrases (constraints + spec)
  for (const phrase of bannedPhrases) {
    if (phrase && lower.includes(phrase)) {
      violatedConstraints.push(`bannedPhrase:${phrase}`);
      issues.push(`Bevat verboden uitdrukking: "${phrase}".`);
    }
  }

  for (const phrase of spec.bannedCliches) {
    const p = phrase.toLowerCase();
    if (p && lower.includes(p)) {
      violatedConstraints.push(`bannedCliche:${p}`);
      issues.push(`Bevat verboden cliché: "${phrase}".`);
    }
  }

  // Topics (soft check, alleen signaleren)
  for (const topic of bannedTopics) {
    if (topic && lower.includes(topic)) {
      issues.push(`Raakt een onderwerp dat je liever vermijdt: "${topic}".`);
      violatedConstraints.push(`bannedTopic:${topic}`);
    }
  }

  // Hype / salesy taal
  for (const pattern of HYPE_PATTERNS) {
    if (lower.includes(pattern)) {
      issues.push("Tekst bevat hype-achtige formuleringen.");
      suggestions.push(
        "Formuleer claims concreter en nuchterder, vermijd hype-termen."
      );
      break;
    }
  }

  for (const pattern of bannedCtaPatterns) {
    if (lower.includes(pattern)) {
      issues.push("Call-to-action is te salesy voor de ingestelde stijl.");
      suggestions.push(
        "Gebruik een zachtere uitnodiging, bijvoorbeeld een vraag of een uitnodiging tot gesprek."
      );
      violatedConstraints.push(`salesyCta:${pattern}`);
      break;
    }
  }

  // Grove structuur-check: minimaal een duidelijke opening en een afsluiting
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmptyLines = lines.filter((l) => l.length > 0);
  if (nonEmptyLines.length < 3) {
    issues.push(
      "De post is erg kort; overweeg iets meer context (story/insight) toe te voegen."
    );
    suggestions.push(
      "Voeg 1–2 korte alinea's toe met een concreet voorbeeld of een korte uitleg."
    );
  }

  // Scoreberekening
  let score = 1;

  // Hard violations trekken score sterk omlaag
  if (violatedConstraints.length > 0) {
    score -= 0.6;
  }

  // Extra issues trekken score verder naar beneden
  if (issues.length > 0) {
    score -= Math.min(0.4, issues.length * 0.1);
  }

  if (score < 0) {
    score = 0;
  }

  return {
    score,
    issues,
    suggestions,
    violatedConstraints,
  };
}


