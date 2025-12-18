import { NextRequest, NextResponse } from "next/server";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import {
  upsertProfileAnswer,
  listFoundationAnswers,
  upsertProfileState,
} from "@/lib/bureauai/repo";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";

type AnswerRequestBody = {
  projectId?: string | null;
  questionKey?: string;
  answerText?: string;
  answerJson?: unknown | null;
};

export async function POST(request: NextRequest) {
  try {
    let body: AnswerRequestBody;
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

    const { projectId, questionKey, answerText, answerJson } = body;

    if (!questionKey || typeof questionKey !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "questionKey is verplicht en moet een niet-lege string zijn.",
          action:
            "Stuur een geldige questionKey mee, bijvoorbeeld 'foundations.target_audience'.",
        },
        { status: 400 }
      );
    }

    const isFoundationKey = FOUNDATIONS_KEYS.includes(questionKey as any);
    const isAdaptiveKey = questionKey.startsWith("adaptive.");

    if (!isFoundationKey && !isAdaptiveKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message:
            "questionKey moet een geldige foundations- of adaptive-sleutel zijn.",
          action:
            "Gebruik een foundations key (bijv. 'foundations.target_audience') of een adaptive key die begint met 'adaptive.'.",
        },
        { status: 400 }
      );
    }

    if (!answerText || typeof answerText !== "string" || !answerText.trim()) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "answerText is verplicht en mag niet leeg zijn.",
          action: "Vul een inhoudelijk antwoord in en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

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

    await upsertProfileAnswer({
      workspaceId,
      projectId: effectiveProjectId,
      questionKey,
      answerText: answerText.trim(),
      answerJson: answerJson ?? null,
    });

    const answers = await listFoundationAnswers({
      workspaceId,
      projectId: effectiveProjectId,
    });

    const foundationsSet = new Set(FOUNDATIONS_KEYS);
    const answeredFoundationKeys = new Set<string>();

    for (const answer of answers) {
      if (foundationsSet.has(answer.questionKey as any)) {
        answeredFoundationKeys.add(answer.questionKey);
      }
    }

    const knownKeys = Array.from(answeredFoundationKeys);
    const missingKeys = FOUNDATIONS_KEYS.filter(
      (key) => !answeredFoundationKeys.has(key)
    );

    const totalFoundations = FOUNDATIONS_KEYS.length;
    const confidenceScore =
      totalFoundations > 0 ? knownKeys.length / totalFoundations : 0;

    await upsertProfileState({
      workspaceId,
      projectId: effectiveProjectId,
      knownKeys,
      missingKeys,
      confidenceScore,
      lastQuestionKey: questionKey,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
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

    console.error("[PROFILE][ANSWER][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Er is een onverwachte fout opgetreden bij het opslaan van het profielantwoord.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


