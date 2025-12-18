import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";

export type AnswerType = "text" | "select" | "multi" | "boolean";

export type QuestionMeta = {
  questionKey: (typeof FOUNDATIONS_KEYS)[number];
  questionText: string;
  answerType: AnswerType;
  options?: string[];
};

export const QUESTION_BANK: Record<string, QuestionMeta> = {
  "foundations.target_audience": {
    questionKey: "foundations.target_audience",
    questionText:
      "Voor wie maak je vooral content? Beschrijf je ideale doelgroep zo concreet mogelijk.",
    answerType: "text",
  },
  "foundations.main_problem": {
    questionKey: "foundations.main_problem",
    questionText: "Welk hoofdpijnprobleem los je op voor je doelgroep?",
    answerType: "text",
  },
  "foundations.current_situation": {
    questionKey: "foundations.current_situation",
    questionText:
      "Hoe ziet de huidige situatie van je ideale klant eruit (voor ze met jou werken)?",
    answerType: "text",
  },
  "foundations.desired_outcome": {
    questionKey: "foundations.desired_outcome",
    questionText:
      "Wat is de gewenste uitkomst / resultaten waar je klanten voor bij jou komen?",
    answerType: "text",
  },
  "foundations.main_offer": {
    questionKey: "foundations.main_offer",
    questionText:
      "Wat is je belangrijkste aanbod of product waar je nu aandacht op wilt?",
    answerType: "text",
  },
  "foundations.differentiator": {
    questionKey: "foundations.differentiator",
    questionText:
      "Wat maakt jouw aanpak anders dan alternatieven of concurrenten?",
    answerType: "text",
  },
  "foundations.price_positioning": {
    questionKey: "foundations.price_positioning",
    questionText:
      "Hoe positioneer je jezelf qua prijs en waarde? (bijv. premium, midden, betaalbaar)",
    answerType: "select",
    options: ["premium", "boven gemiddeld", "midden", "betaalbaar", "budget"],
  },
  "foundations.tone_keywords": {
    questionKey: "foundations.tone_keywords",
    questionText:
      "Hoe zou je je toon omschrijven in 3–5 woorden? (bijv. \"direct\", \"speels\", \"nuchter\")",
    answerType: "text",
  },
  "foundations.formality_level": {
    questionKey: "foundations.formality_level",
    questionText: "Hoe formeel wil je klinken?",
    answerType: "select",
    options: [
      "zeer informeel",
      "informeel",
      "neutraal",
      "formeel",
      "zeer formeel",
    ],
  },
  "foundations.persona_role": {
    questionKey: "foundations.persona_role",
    questionText:
      "Vanuit welke rol wil je vooral communiceren? (bijv. expert, mentor, maker, directeur)",
    answerType: "text",
  },
  "foundations.nl_or_english": {
    questionKey: "foundations.nl_or_english",
    questionText: "In welke taal(en) wil je primair publiceren?",
    answerType: "multi",
    options: ["Nederlands", "Engels", "Nederlands + Engels"],
  },
  "foundations.banned_phrases": {
    questionKey: "foundations.banned_phrases",
    questionText:
      "Zijn er woorden, termen of clichés die we absoluut nooit mogen gebruiken?",
    answerType: "text",
  },
  "foundations.topics_to_avoid": {
    questionKey: "foundations.topics_to_avoid",
    questionText:
      "Zijn er onderwerpen of invalshoeken die je liever vermijdt?",
    answerType: "text",
  },
  "foundations.call_to_action_style": {
    questionKey: "foundations.call_to_action_style",
    questionText:
      "Hoe direct mag een call-to-action zijn? (bijv. \"heel zacht\", \"neutraal\", \"duidelijk\")",
    answerType: "select",
    options: ["heel zacht", "neutraal", "duidelijk", "sterk sales-gericht"],
  },
  "foundations.time_constraints": {
    questionKey: "foundations.time_constraints",
    questionText:
      "Zijn er praktische beperkingen waar we rekening mee moeten houden? (bijv. max aantal posts/week, geen weekends)",
    answerType: "text",
  },
};


