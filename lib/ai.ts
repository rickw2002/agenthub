import { openai, OPENAI_MODEL } from "@/lib/openai";

type GenerateTextArgs = {
  system: string;
  user: string;
  extraSystem?: string | string[];
  temperature?: number;
};

export async function generateText({
  system,
  user,
  extraSystem,
  temperature,
}: GenerateTextArgs): Promise<string> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  messages.push({ role: "system", content: system });

  if (extraSystem) {
    if (Array.isArray(extraSystem)) {
      for (const extra of extraSystem) {
        messages.push({ role: "system", content: extra });
      }
    } else {
      messages.push({ role: "system", content: extraSystem });
    }
  }

  messages.push({ role: "user", content: user });

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature,
    });

    const reply =
      completion.choices[0]?.message?.content?.toString().trim() ?? "";

    return reply;
  } catch (err) {
    console.error("[AI][OPENAI] error", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}


