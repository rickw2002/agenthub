import OpenAI from "openai";

let _openai: OpenAI | null = null;

// Lazy initialization to avoid build-time errors when env vars are not set
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    if (!_openai) {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY ontbreekt. Zet deze in je environment variables (server-side)."
        );
      }

      _openai = new OpenAI({
        apiKey,
      });
    }
    return (_openai as any)[prop];
  },
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";


