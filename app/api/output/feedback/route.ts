import { NextRequest, NextResponse } from "next/server";
import {
  BureauAIErrorImpl,
  getCurrentContext,
  assertProjectInOrg,
} from "@/lib/bureauai/tenancy";
import {
  getOutputById,
  createFeedback,
  getProfileCardByVersion,
  createProfileCardNextVersionTx,
} from "@/lib/bureauai/repo";
import { applyFeedbackToCards } from "@/lib/bureauai/engine/feedbackUpdater";

type FeedbackRequestBody = {
  outputId?: string;
  rating?: number;
  notes?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    let body: FeedbackRequestBody;
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

    const { outputId, rating, notes } = body ?? {};

    if (!outputId || typeof outputId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "outputId is verplicht en moet een string zijn.",
          action: "Stuur een geldig outputId mee en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || !Number.isFinite(rating)) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "rating is verplicht en moet een getal zijn.",
          action: "Geef een rating tussen 1 en 5 en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "rating moet tussen 1 en 5 liggen.",
          action: "Pas je rating aan naar een waarde tussen 1 en 5.",
        },
        { status: 400 }
      );
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "notes moet een string of null zijn.",
          action: "Controleer je feedbacktekst en probeer het opnieuw.",
        },
        { status: 400 }
      );
    }

    const { workspaceId, orgId } = await getCurrentContext();

    const output = await getOutputById(outputId);

    if (!output || output.workspaceId !== workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          code: "OUTPUT_NOT_FOUND",
          message: "De opgegeven output kon niet worden gevonden.",
          action: "Ververs de pagina en probeer het opnieuw.",
        },
        { status: 404 }
      );
    }

    if (output.projectId) {
      await assertProjectInOrg(output.projectId, orgId);
    }

    await createFeedback({
      outputId: output.id,
      rating,
      notes: notes ?? null,
    });

    if (output.profileCardVersion == null) {
      return NextResponse.json(
        {
          ok: false,
          code: "OUTPUT_HAS_NO_PROFILE",
          message:
            "Deze output is niet gekoppeld aan een profielkaart en kan niet worden gebruikt voor personalisatie-updates.",
          action: "Genereer eerst content met een gesynthetiseerd profiel.",
        },
        { status: 400 }
      );
    }

    const profileCard = await getProfileCardByVersion({
      workspaceId: output.workspaceId,
      projectId: output.projectId,
      version: output.profileCardVersion,
    });

    if (!profileCard) {
      return NextResponse.json(
        {
          ok: false,
          code: "OUTPUT_HAS_NO_PROFILE",
          message:
            "De gekoppelde profielkaart kon niet worden gevonden voor deze output.",
          action: "Synthesiseer opnieuw een profiel en genereer nieuwe content.",
        },
        { status: 400 }
      );
    }

    const { updated, next } = applyFeedbackToCards({
      rating,
      notes: notes ?? null,
      current: {
        voiceCard: profileCard.voiceCard,
        audienceCard: profileCard.audienceCard,
        offerCard: profileCard.offerCard,
        constraints: profileCard.constraints,
      },
    });

    if (!updated) {
      return NextResponse.json(
        {
          ok: true,
          newProfileVersion: profileCard.version,
        },
        { status: 200 }
      );
    }

    const nextCard = await createProfileCardNextVersionTx({
      workspaceId: output.workspaceId,
      projectId: output.projectId,
      voiceCard: next.voiceCard,
      audienceCard: next.audienceCard,
      offerCard: next.offerCard,
      constraints: next.constraints,
    });

    return NextResponse.json(
      {
        ok: true,
        newProfileVersion: nextCard.version,
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

    console.error("[OUTPUT][FEEDBACK][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het verwerken van feedback.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


