type CardsBundle = {
  voiceCard: any;
  audienceCard: any;
  offerCard: any;
  constraints: any;
};

const CTA_LEVELS = ["heel_zacht", "neutraal", "duidelijk", "sales_gericht"] as const;
const FORMALITY_LEVELS = [
  "zeer_informeel",
  "informeel",
  "neutraal",
  "formeel",
  "zeer_formeel",
] as const;

function makeArray<T>(value: T[] | T | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value as T];
}

function stepSofterCtaLevel(level: string | undefined | null): string | undefined {
  if (!level) return undefined;
  const idx = CTA_LEVELS.indexOf(level as any);
  if (idx === -1) return undefined;
  if (idx === 0) return CTA_LEVELS[0];
  return CTA_LEVELS[idx - 1];
}

function stepMoreInformalFormality(level: string | undefined | null): string | undefined {
  if (!level) return undefined;
  const idx = FORMALITY_LEVELS.indexOf(level as any);
  if (idx === -1) return undefined;
  if (idx === 0) return FORMALITY_LEVELS[0];
  return FORMALITY_LEVELS[idx - 1];
}

export function applyFeedbackToCards(args: {
  rating: number;
  notes?: string | null;
  current: CardsBundle;
}): { updated: boolean; next: CardsBundle } {
  const { rating, notes, current } = args;
  const noteText = (notes ?? "").toLowerCase();

  // Clone shallowly to avoid mutating input references
  const next: CardsBundle = {
    voiceCard: current.voiceCard ? { ...current.voiceCard } : {},
    audienceCard: current.audienceCard ? { ...current.audienceCard } : {},
    offerCard: current.offerCard ? { ...current.offerCard } : {},
    constraints: current.constraints ? { ...current.constraints } : {},
  };

  let updated = false;

  if (rating >= 4) {
    return { updated: false, next: current };
  }

  if (rating <= 2) {
    // Constraints adjustments
    const constraints = next.constraints || {};

    if (noteText.includes("salesy") || noteText.includes("te sales") || noteText.includes("te commerc")) {
      const cta = constraints.ctaStyle || {};
      const nextLevel = stepSofterCtaLevel(cta.level);
      if (nextLevel && nextLevel !== cta.level) {
        constraints.ctaStyle = { ...cta, level: nextLevel };
        updated = true;
      }

      const bannedCtaPatterns = makeArray<string>(cta.bannedCtaPatterns);
      const toAdd: string[] = [];
      if (noteText.includes("meld je aan")) {
        toAdd.push("meld je aan");
      }
      if (noteText.includes("koop nu")) {
        toAdd.push("koop nu");
      }
      for (const p of toAdd) {
        if (!bannedCtaPatterns.includes(p)) {
          bannedCtaPatterns.push(p);
          updated = true;
        }
      }
      if (toAdd.length > 0) {
        constraints.ctaStyle = {
          ...constraints.ctaStyle,
          bannedCtaPatterns,
        };
      }
    }

    if (noteText.includes("te formeel") || noteText.includes("te stijf")) {
      const voice = next.voiceCard || {};
      const nextLevel = stepMoreInformalFormality(voice.formality);
      if (nextLevel && nextLevel !== voice.formality) {
        voice.formality = nextLevel;
        next.voiceCard = voice;
        updated = true;
      }
    }

    if (noteText.includes("te hype") || noteText.includes("klinkt als guru")) {
      const voice = next.voiceCard || {};
      const avoidPatterns = makeArray<string>(voice.avoidStylePatterns);
      const noHype = "geen hype-taal";
      if (!avoidPatterns.includes(noHype)) {
        avoidPatterns.push(noHype);
        voice.avoidStylePatterns = avoidPatterns;
        next.voiceCard = voice;
        updated = true;
      }

      const hypeWords = ["10x", "game changer", "revolutionair"];
      const bannedPhrases = makeArray<string>(constraints.bannedPhrases);
      let phrasesChanged = false;
      for (const w of hypeWords) {
        if (!bannedPhrases.includes(w)) {
          bannedPhrases.push(w);
          phrasesChanged = true;
        }
      }
      if (phrasesChanged) {
        constraints.bannedPhrases = bannedPhrases;
        updated = true;
      }
    }

    next.constraints = next.constraints || constraints;
  }

  return { updated, next };
}


