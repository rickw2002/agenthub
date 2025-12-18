import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import { getEffectiveProfile } from "@/lib/bureauai/effectiveProfile";
import { generateText } from "@/lib/ai";
import { buildBrainstormPrompt } from "@/lib/bureauai/prompts/brainstormPrompt";
import {
  listFoundationAnswers,
  listExamples,
  getLatestProfileCard,
  createProfileCardNextVersionTx,
} from "@/lib/bureauai/repo";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";
import { buildProfileSynthesisPrompt } from "@/lib/bureauai/prompts/profileSynthPrompt";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type BrainstormRequest = {
  projectId?: string | null;
  topic?: string;
  postType?: string;
};

export async function POST(request: NextRequest) {
  try {
    let body: BrainstormRequest;
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

    const { projectId, topic, postType } = body ?? {};

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

    const effectiveProfile = await getEffectiveProfile(
      prisma,
      workspaceId,
      effectiveProjectId
    );

    const { workspaceCardVersion, projectCardVersion } = effectiveProfile;

    let profileCardVersion: number | null = null;
    if (projectCardVersion != null) {
      profileCardVersion = projectCardVersion;
    } else if (workspaceCardVersion != null) {
      profileCardVersion = workspaceCardVersion;
    }

    // Als er nog geen ProfileCard is, probeer automatisch te synthetiseren
    if (profileCardVersion == null) {
      try {
        const foundationAnswers = await listFoundationAnswers({
          workspaceId,
          projectId: effectiveProjectId,
        });

        const answeredKeys = new Set(
          foundationAnswers.map((a) => a.questionKey)
        );
        const allFoundationsAnswered = FOUNDATIONS_KEYS.every((key) =>
          answeredKeys.has(key)
        );

        if (!allFoundationsAnswered) {
          return NextResponse.json(
            {
              ok: false,
              code: "PROFILE_INCOMPLETE",
              message:
                "Je profiel is nog niet compleet. Vul eerst alle vragen in via Account → Personalisatie.",
              action: "Ga naar /account/personalization om je profiel af te maken.",
            },
            { status: 400 }
          );
        }

        const [examples, previousCard] = await Promise.all([
          listExamples({
            workspaceId,
            projectId: effectiveProjectId,
          }),
          getLatestProfileCard({
            workspaceId,
            projectId: effectiveProjectId,
          }),
        ]);

        const foundationsForPrompt = foundationAnswers.map((a) => ({
          questionKey: a.questionKey,
          answerText: a.answerText,
          answerJson: a.answerJson,
        }));

        const examplesForPrompt = examples.map((e) => ({
          kind: e.kind,
          content: e.content,
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

        const synthesizedJson = await generateText({
          system,
          user,
          temperature: 0.3,
        });

        let synthesized: {
          voiceCard: unknown;
          audienceCard: unknown;
          offerCard: unknown;
          constraints: unknown;
        };

        try {
          synthesized = JSON.parse(synthesizedJson.trim());
        } catch (parseError) {
          console.error(
            "[BRAINSTORM][SYNTHESIS] JSON parse error:",
            parseError
          );
          return NextResponse.json(
            {
              ok: false,
              code: "SYNTHESIS_PARSE_ERROR",
              message:
                "Kon gesynthetiseerd profiel niet verwerken. Probeer het opnieuw.",
              action:
                "Als het probleem blijft, neem contact op met de ondersteuning.",
            },
            { status: 500 }
          );
        }

        const newCard = await createProfileCardNextVersionTx({
          workspaceId,
          projectId: effectiveProjectId,
          voiceCard: synthesized.voiceCard as Prisma.JsonValue,
          audienceCard: synthesized.audienceCard as Prisma.JsonValue,
          offerCard: synthesized.offerCard as Prisma.JsonValue,
          constraints: synthesized.constraints as Prisma.JsonValue,
        });

        profileCardVersion = newCard.version;

        effectiveProfile.workspaceCardVersion =
          effectiveProjectId == null ? newCard.version : null;
        effectiveProfile.projectCardVersion =
          effectiveProjectId != null ? newCard.version : null;
        effectiveProfile.voiceCard = synthesized.voiceCard as Prisma.JsonValue;
        effectiveProfile.audienceCard = synthesized.audienceCard as Prisma.JsonValue;
        effectiveProfile.offerCard = synthesized.offerCard as Prisma.JsonValue;
        effectiveProfile.constraints = synthesized.constraints as Prisma.JsonValue;
      } catch (synthesizeError) {
        console.error("[BRAINSTORM][SYNTHESIS] error:", synthesizeError);
        return NextResponse.json(
          {
            ok: false,
            code: "SYNTHESIS_ERROR",
            message:
              "Er is een fout opgetreden bij het automatisch synthetiseren van je profiel.",
            action:
              "Probeer het later opnieuw of neem contact op met de ondersteuning.",
          },
          { status: 500 }
        );
      }
    }

    const { voiceCard, audienceCard, offerCard, constraints } =
      effectiveProfile;

    const { system, user } = buildBrainstormPrompt({
      topic: topic?.trim() || undefined,
      profile: {
        voiceCard,
        audienceCard,
        offerCard,
        constraints,
      },
    });

    let generated: string;
    try {
      generated = await generateText({
        system,
        user,
        temperature: 0.7, // Hoger voor meer creativiteit
      });
    } catch (err) {
      console.error("[BRAINSTORM][GENERATE][OPENAI] error:", err);
      return NextResponse.json(
        {
          ok: false,
          code: "LLM_ERROR",
          message:
            "De AI kon geen content ideeën genereren door een fout in het taalmodel.",
          action:
            "Probeer het later opnieuw. Als het probleem blijft terugkomen, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    let ideas: string[];
    try {
      const parsed = JSON.parse(generated.trim());
      if (Array.isArray(parsed)) {
        ideas = parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        );
      } else {
        throw new Error("Response is not an array");
      }
    } catch (parseError) {
      console.error("[BRAINSTORM][PARSE] error:", parseError);
      return NextResponse.json(
        {
          ok: false,
          code: "PARSE_ERROR",
          message: "Kon gegenereerde ideeën niet verwerken.",
          action: "Probeer het opnieuw.",
        },
        { status: 500 }
      );
    }

    if (ideas.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_IDEAS",
          message: "Er zijn geen ideeën gegenereerd.",
          action: "Probeer het opnieuw met een ander onderwerp.",
        },
        { status: 500 }
      );
    }

    // Optioneel: sla eerste idee op als Output (voor Content Bank)
    // Voor nu returnen we alleen de ideeën

    return NextResponse.json(
      {
        ok: true,
        ideas,
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

    console.error("[BRAINSTORM][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het genereren van content ideeën.",
      },
      { status: 500 }
    );
  }
}

