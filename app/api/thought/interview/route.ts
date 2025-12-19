import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import { getEffectiveProfile } from "@/lib/bureauai/effectiveProfile";
import { generateText } from "@/lib/ai";
import { buildInterviewPrompt } from "@/lib/bureauai/prompts/interviewPrompt";
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

type InterviewRequest = {
  projectId?: string | null;
  thought: string;
  channel?: "linkedin" | "blog";
};

export async function POST(request: NextRequest) {
  try {
    let body: InterviewRequest;
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

    const { projectId, thought, channel } = body ?? {};

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

    if (!thought || typeof thought !== "string" || thought.trim().length < 10) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message:
            "thought is verplicht en moet minimaal 10 tekens lang zijn.",
          action: "Vul een duidelijke gedachte in en probeer het opnieuw.",
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
            "[INTERVIEW][SYNTHESIS] JSON parse error:",
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
        console.error("[INTERVIEW][SYNTHESIS] error:", synthesizeError);
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

    const { system, user } = buildInterviewPrompt({
      thought: thought.trim(),
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
        temperature: 0.3, // Lager voor meer focus
      });
    } catch (err) {
      console.error("[INTERVIEW][GENERATE][OPENAI] error:", err);
      return NextResponse.json(
        {
          ok: false,
          code: "LLM_ERROR",
          message:
            "De AI kon geen interview vragen genereren door een fout in het taalmodel.",
          action:
            "Probeer het later opnieuw. Als het probleem blijft terugkomen, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    let questions: Array<{
      key: string;
      question: string;
      intent: string;
    }>;
    try {
      const parsed = JSON.parse(generated.trim());
      if (Array.isArray(parsed)) {
        questions = parsed.filter(
          (item): item is { key: string; question: string; intent: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof item.key === "string" &&
            typeof item.question === "string" &&
            typeof item.intent === "string"
        );
      } else {
        throw new Error("Response is not an array");
      }
    } catch (parseError) {
      console.error("[INTERVIEW][PARSE] error:", parseError);
      return NextResponse.json(
        {
          ok: false,
          code: "PARSE_ERROR",
          message: "Kon gegenereerde vragen niet verwerken.",
          action: "Probeer het opnieuw.",
        },
        { status: 500 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_QUESTIONS",
          message: "Er zijn geen vragen gegenereerd.",
          action: "Probeer het opnieuw met een andere thought.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        questions,
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

    console.error("[INTERVIEW][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het genereren van interview vragen.",
      },
      { status: 500 }
    );
  }
}

