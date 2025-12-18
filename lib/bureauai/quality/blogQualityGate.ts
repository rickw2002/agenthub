type BlogLengthMode = "short" | "medium" | "long";

type BlogSpecV1 = {
  version: "BlogSpecV1";
  lengthMode: BlogLengthMode;
  minWords: number;
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

export type BlogQualityResult = {
  score: number;
  issues: string[];
  suggestions: string[];
  violatedConstraints: string[];
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

export function buildBlogSpecV1(lengthMode: BlogLengthMode): BlogSpecV1 {
  let minWords = 400;
  if (lengthMode === "medium") {
    minWords = 800;
  } else if (lengthMode === "long") {
    minWords = 1200;
  }

  return {
    version: "BlogSpecV1",
    lengthMode,
    minWords,
  };
}

export function evaluateBlogQuality(args: {
  text: string;
  spec: BlogSpecV1;
  voiceCard: unknown;
  constraints: ConstraintsLike;
}): BlogQualityResult {
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

  // Hard constraint: banned phrases / topics
  for (const phrase of bannedPhrases) {
    if (phrase && lower.includes(phrase)) {
      violatedConstraints.push(`bannedPhrase:${phrase}`);
      issues.push(`Bevat verboden uitdrukking: "${phrase}".`);
    }
  }

  for (const topic of bannedTopics) {
    if (topic && lower.includes(topic)) {
      violatedConstraints.push(`bannedTopic:${topic}`);
      issues.push(`Raakt een onderwerp dat je liever vermijdt: "${topic}".`);
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

  // Lengte-check (ruwe schatting op basis van woorden)
  const words = text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < spec.minWords) {
    issues.push(
      `De blog is korter dan de aanbevolen minimale lengte voor ${spec.lengthMode} (minimaal ${spec.minWords} woorden).`
    );
    suggestions.push(
      "Voeg extra context, voorbeelden of verdieping toe om de blog completer te maken."
    );
  }

  // Scoreberekening
  let score = 1;

  if (violatedConstraints.length > 0) {
    score -= 0.6;
  }

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


