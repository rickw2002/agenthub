export const FOUNDATIONS_KEYS = [
  "foundations.target_audience",
  "foundations.main_problem",
  "foundations.current_situation",
  "foundations.desired_outcome",
  "foundations.main_offer",
  "foundations.differentiator",
  "foundations.price_positioning",
  "foundations.tone_keywords",
  "foundations.formality_level",
  "foundations.persona_role",
  "foundations.nl_or_english",
  "foundations.banned_phrases",
  "foundations.topics_to_avoid",
  "foundations.call_to_action_style",
  "foundations.time_constraints",
] as const;

export type FoundationKey = (typeof FOUNDATIONS_KEYS)[number];


