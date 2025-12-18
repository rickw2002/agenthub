import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import { getEffectiveProfile } from "@/lib/bureauai/effectiveProfile";
import { generateText } from "@/lib/ai";
import { buildLinkedInGeneratorPrompt } from "@/lib/bureauai/prompts/linkedinGeneratorPrompt";
import {
  evaluateLinkedInQuality,
  LINKEDIN_SPEC_V1,
} from "@/lib/bureauai/quality/linkedinQualityGate";
import {
  listFoundationAnswers,
  listExamples,
  getLatestProfileCard,
  createProfileCardNextVersionTx,
} from "@/lib/bureauai/repo";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";
import { buildProfileSynthesisPrompt } from "@/lib/bureauai/prompts/profileSynthPrompt";

type LinkedInGenerateRequest = {
  projectId?: string | null;
  thought?: string;
  length?: "short" | "medium" | "long";
};

const FALLBACK_MODEL_NAME = "unknown";

export async function POST(request: NextRequest) {
  try {
    let body: LinkedInGenerateRequest;
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

    const { projectId, thought, length } = body ?? {};

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

    const lengthMode: "short" | "medium" | "long" =
      length === "short" || length === "long" ? length : "medium";

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
        // Check of alle foundation questions zijn beantwoord
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

        // Synthetiseer automatisch het profiel
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
            "[LINKEDIN][GENERATE][SYNTHESIS] JSON parse error:",
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

        // Maak nieuwe ProfileCard versie
        const newCard = await createProfileCardNextVersionTx({
          workspaceId,
          projectId: effectiveProjectId,
          voiceCard: synthesized.voiceCard as Prisma.JsonValue,
          audienceCard: synthesized.audienceCard as Prisma.JsonValue,
          offerCard: synthesized.offerCard as Prisma.JsonValue,
          constraints: synthesized.constraints as Prisma.JsonValue,
        });

        profileCardVersion = newCard.version;

        // Update effectiveProfile met nieuwe card data
        effectiveProfile.workspaceCardVersion =
          effectiveProjectId == null ? newCard.version : null;
        effectiveProfile.projectCardVersion =
          effectiveProjectId != null ? newCard.version : null;
        effectiveProfile.voiceCard = synthesized.voiceCard as Prisma.JsonValue;
        effectiveProfile.audienceCard = synthesized.audienceCard as Prisma.JsonValue;
        effectiveProfile.offerCard = synthesized.offerCard as Prisma.JsonValue;
        effectiveProfile.constraints = synthesized.constraints as Prisma.JsonValue;
      } catch (synthesizeError) {
        console.error("[LINKEDIN][GENERATE][SYNTHESIS] error:", synthesizeError);
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

    const { voiceCard, audienceCard, offerCard, constraints, examples } =
      effectiveProfile;

    const examplesForPrompt = examples.map((e: any) => ({
      kind: e.kind,
      content: e.content,
    }));

    const { system, user } = buildLinkedInGeneratorPrompt({
      thought: thought.trim(),
      length: lengthMode,
      profile: {
        voiceCard,
        audienceCard,
        offerCard,
        constraints,
      },
      examples: examplesForPrompt,
      specVersion: "LinkedInSpecV1",
    });

    let generated: string;
    try {
      generated = await generateText({
        system,
        user,
        temperature: 0.4,
      });
    } catch (err) {
      console.error("[LINKEDIN][GENERATE][OPENAI] error:", err);
      return NextResponse.json(
        {
          ok: false,
          code: "LLM_ERROR",
          message:
            "De AI kon geen LinkedIn-post genereren door een fout in het taalmodel.",
          action:
            "Probeer het later opnieuw. Als het probleem blijft terugkomen, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    const content = generated.trim();

    const quality = evaluateLinkedInQuality({
      text: content,
      spec: LINKEDIN_SPEC_V1,
      voiceCard,
      constraints: constraints as any,
    });

    if (quality.score < 0.5) {
      return NextResponse.json(
        {
          ok: false,
          code: "QUALITY_REJECTED",
          message:
            "De gegenereerde post voldoet niet aan je profiel en contentregels.",
          action: "Pas je thought aan of verfijn je profiel.",
        },
        { status: 400 }
      );
    }

    const modelName = process.env.OPENAI_MODEL ?? FALLBACK_MODEL_NAME;

    const qualityToStore = {
      ...quality,
      specMeta: {
        version: LINKEDIN_SPEC_V1.version,
        channel: "linkedin",
        bannedClichesCount: LINKEDIN_SPEC_V1.bannedCliches.length,
      },
    };

    const output = await prisma.output.create({
      data: {
        workspaceId,
        projectId: effectiveProjectId,
        channel: "linkedin",
        mode: "thought_to_post",
        inputJson: {
          thought: thought.trim(),
          length: lengthMode,
        },
        content,
        quality: qualityToStore,
        modelName,
        specVersion: "LinkedInSpecV1",
        profileCardVersion,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        content,
        quality: {
          score: quality.score,
          issues: quality.issues,
          suggestions: quality.suggestions,
        },
        outputId: output.id,
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

    console.error("[LINKEDIN][GENERATE][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het genereren van de LinkedIn-post.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


