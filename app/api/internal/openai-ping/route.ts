import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const internalToken = process.env.INTERNAL_TOKEN;
    const headerToken = request.headers.get("x-internal-token");

    if (!internalToken || headerToken !== internalToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const reply = await generateText({
      system: "Antwoord exact met: pong",
      user: "Zeg pong",
    });

    return NextResponse.json(
      {
        ok: true,
        reply,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[OPENAI-PING] error", error);
    return NextResponse.json(
      { ok: false, error: "OpenAI ping failed" },
      { status: 500 }
    );
  }
}


