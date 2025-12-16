export type RagOutputMode = "summary" | "plan" | "checklist" | "qa";

type WorkspaceContextStrings = {
  profileJson: string | null;
  goalsJson: string | null;
  preferencesJson: string | null;
};

type RetrievedChunk = {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
};

export function buildDocumentRagPrompt(options: {
  question: string;
  mode: RagOutputMode;
  workspaceContext: WorkspaceContextStrings | null;
  chunks: RetrievedChunk[];
}): string {
  const { question, mode, workspaceContext, chunks } = options;

  let profile: any = {};
  let goals: any = {};
  let preferences: any = {};

  if (workspaceContext) {
    try {
      if (workspaceContext.profileJson) {
        profile = JSON.parse(workspaceContext.profileJson);
      }
    } catch {
      // ignore parse errors
    }
    try {
      if (workspaceContext.goalsJson) {
        goals = JSON.parse(workspaceContext.goalsJson);
      }
    } catch {
      // ignore parse errors
    }
    try {
      if (workspaceContext.preferencesJson) {
        preferences = JSON.parse(workspaceContext.preferencesJson);
      }
    } catch {
      // ignore parse errors
    }
  }

  const rol = profile.rol ?? "onbekende rol";
  const branche = profile.branche ?? "onbekende branche";
  const hoofdDoelen = goals.doelen ?? "niet gespecificeerd";

  const modeInstruction =
    mode === "summary"
      ? "Geef een korte, concrete samenvatting in het Nederlands."
      : mode === "plan"
      ? "Geef een kort, stap-voor-stap actieplan in het Nederlands (maximaal 5 stappen)."
      : mode === "checklist"
      ? "Geef een beknopte checklist met afvinkbare punten in het Nederlands."
      : "Beantwoord de vraag in het Nederlands als een korte, directe Q&A.";

  const chunksText = chunks
    .map(
      (c, idx) =>
        `--- Fragment ${idx + 1} (document: "${c.documentTitle}", index: ${c.chunkIndex}) ---\n${c.text}`
    )
    .join("\n\n");

  return [
    "Je bent een AI-assistent voor MKB-bedrijven.",
    "Je antwoordt ALTIJD in het Nederlands, kort en actiegericht.",
    "",
    "=== Gebruikerscontext ===",
    `Rol: ${rol}`,
    `Branche: ${branche}`,
    `Belangrijkste doelen: ${hoofdDoelen}`,
    "",
    "=== Voorkeuren (vrij veld, kan leeg zijn) ===",
    JSON.stringify(preferences, null, 2),
    "",
    "=== Documentfragmenten (enkel deze informatie gebruiken, geen externe kennis) ===",
    chunksText.length > 0 ? chunksText : "[GEEN RELEVANTE FRAGMENTEN GEVONDEN]",
    "",
    "=== Opdracht ===",
    `Vraag van de gebruiker: "${question}"`,
    "",
    modeInstruction,
    "Gebruik expliciet de informatie uit de fragmenten en pas je antwoord aan op de rol en doelen van de gebruiker.",
  ].join("\n");
}


