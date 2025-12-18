import { NextRequest, NextResponse } from "next/server";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import {
  listFoundationAnswers,
  listExamples,
  getLatestProfileCard,
  createProfileCardNextVersionTx,
} from "@/lib/bureauai/repo";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";
import { generateText } from "@/lib/ai";
import { buildProfileSynthesisPrompt } from "@/lib/bureauai/prompts/profileSynthPrompt";

type SynthesizeRequestBody = {
  projectId?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    let body: SynthesizeRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "Ongeldig JSON-formaat in request body.",
          action: "Controleer de invoer en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

    const { projectId } = body ?? {};

    if (
      projectId !== undefined &&
      projectId !== null &&
      typeof projectId !== "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "projectId moet een string of null zijn.",
          action: "Controleer het gekozen project en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

    const { workspaceId, projectId: effectiveProjectId } =
      await resolveWorkspaceProjectContext(projectId ?? null);

    const [foundationAnswers, examples, previousCard] = await Promise.all([
      listFoundationAnswers({
        workspaceId,
        projectId: effectiveProjectId,
      }),
      listExamples({
        workspaceId,
        projectId: effectiveProjectId,
      }),
      getLatestProfileCard({
        workspaceId,
        projectId: effectiveProjectId,
      }),
    ]);

    const answeredKeys = new Set(
      foundationAnswers.map((a) => a.questionKey)
    );

    const missingKeys = FOUNDATIONS_KEYS.filter(
      (key) => !answeredKeys.has(key)
    );

    if (missingKeys.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "PROFILE_INCOMPLETE",
          message: "Nog niet alle basisvragen zijn ingevuld.",
          action: "Beantwoord eerst alle foundations-vragen.",
        },
        { status: 400 }
      );
    }

    const foundationsForPrompt = foundationAnswers.map((a) => ({
      questionKey: a.questionKey,
      answerText: a.answerText,
      answerJson: a.answerJson,
    }));

    const examplesForPrompt = examples.map((e) => ({
      kind: e.kind,
      content: e.content,
      notes: e.notes,
    }));

    const previousCardsForPrompt = previousCard
      ? {
          voiceCard: previousCard.voiceCard,
          audienceCard: previousCard.audienceCard,
          offerCard: previousCard.offerCard,
          constraints: previousCard.constraints,
        }
      : null;

    const { system, user } = buildProfileSynthesisPrompt({
      foundations: foundationsForPrompt,
      examples: examplesForPrompt,
      previousCards: previousCardsForPrompt,
    });

    let raw: string;
    try {
      raw = await generateText({
        system,
        user,
        temperature: 0.2,
      });
    } catch (err) {
      console.error("[PROFILE][SYNTHESIZE][OPENAI] error:", err);
      return NextResponse.json(
        {
          ok: false,
          code: "LLM_ERROR",
          message:
            "De AI kon het profiel niet samenstellen door een fout in het taalmodel.",
          action:
            "Probeer het later opnieuw. Als het probleem blijft terugkomen, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[PROFILE][SYNTHESIZE][PARSE] Invalid JSON from LLM:", {
        error: err,
        raw,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_LLM_JSON",
          message:
            "Het taalmodel leverde geen geldig JSON-profiel op. Er kon geen profielkaart worden opgeslagen.",
          action:
            "Probeer het nog eens. Als dit blijft gebeuren, probeer dan later opnieuw of neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.voiceCard ||
      !parsed.audienceCard ||
      !parsed.offerCard ||
      !parsed.constraints
    ) {
      console.error("[PROFILE][SYNTHESIZE][SCHEMA] Missing required card keys:", {
        parsed,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_LLM_SCHEMA",
          message:
            "Het taalmodel produceerde geen volledig profiel (voice, audience, offer, constraints).",
          action:
            "Probeer het nog eens. Als dit blijft gebeuren, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    const created = await createProfileCardNextVersionTx({
      workspaceId,
      projectId: effectiveProjectId,
      voiceCard: parsed.voiceCard,
      audienceCard: parsed.audienceCard,
      offerCard: parsed.offerCard,
      constraints: parsed.constraints,
    });

    return NextResponse.json(
      {
        ok: true,
        version: created.version,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BureauAIErrorImpl) {
      return NextResponse.json(
        {
          ok: false,
          code: err.code,
          message: err.message,
          action:
            err.action ??
            "Probeer het later opnieuw of neem contact op met de ondersteuning.",
        },
        { status: err.status }
      );
    }

    console.error("[PROFILE][SYNTHESIZE][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het samenstellen van het profiel.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


