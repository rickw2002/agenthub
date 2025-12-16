import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY ontbreekt. Zet deze in je environment variables (server-side)."
  );
}

export const openai = new OpenAI({
  apiKey,
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";


