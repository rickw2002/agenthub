import { NextRequest, NextResponse } from "next/server";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import { listFoundationAnswers } from "@/lib/bureauai/repo";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";
import { QUESTION_BANK } from "@/lib/bureauai/questions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("projectId");

    const { workspaceId, projectId } =
      await resolveWorkspaceProjectContext(projectIdParam);

    const answers = await listFoundationAnswers({
      workspaceId,
      projectId,
    });

    const answeredKeys = new Set<string>(
      answers.map((a) => a.questionKey)
    );

    const nextKey = FOUNDATIONS_KEYS.find(
      (key) => !answeredKeys.has(key)
    );

    if (!nextKey) {
      return NextResponse.json(
        {
          stop: true,
        },
        { status: 200 }
      );
    }

    const meta = QUESTION_BANK[nextKey];

    return NextResponse.json(
      {
        questionKey: meta.questionKey,
        questionText: meta.questionText,
        answerType: meta.answerType,
        options: meta.options ?? [],
        stop: false,
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

    console.error("[PROFILE][NEXT_QUESTION][GET] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het bepalen van de volgende vraag.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


