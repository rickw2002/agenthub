import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";
import { getEffectiveProfile } from "@/lib/bureauai/effectiveProfile";
import { generateText } from "@/lib/ai";
import { buildBlogGeneratorPrompt } from "@/lib/bureauai/prompts/blogGeneratorPrompt";
import {
  buildBlogSpecV1,
  evaluateBlogQuality,
} from "@/lib/bureauai/quality/blogQualityGate";

type BlogGenerateRequest = {
  projectId?: string | null;
  thought?: string;
  length?: "short" | "medium" | "long";
};

const FALLBACK_MODEL_NAME = "unknown";

export async function POST(request: NextRequest) {
  try {
    let body: BlogGenerateRequest;
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

    if (profileCardVersion == null) {
      return NextResponse.json(
        {
          ok: false,
          code: "PROFILE_NOT_SYNTHESIZED",
          message:
            "Er is nog geen profielkaart gesynthetiseerd voor deze scope.",
          action: "Run eerst /api/profile/synthesize.",
        },
        { status: 400 }
      );
    }

    const { voiceCard, audienceCard, offerCard, constraints, examples } =
      effectiveProfile;

    const examplesForPrompt = examples.map((e: any) => ({
      kind: e.kind,
      content: e.content,
    }));

    const { system, user } = buildBlogGeneratorPrompt({
      thought: thought.trim(),
      length: lengthMode,
      profile: {
        voiceCard,
        audienceCard,
        offerCard,
        constraints,
      },
      examples: examplesForPrompt,
      specVersion: "BlogSpecV1",
    });

    let generated: string;
    try {
      generated = await generateText({
        system,
        user,
        temperature: 0.4,
      });
    } catch (err) {
      console.error("[BLOG][GENERATE][OPENAI] error:", err);
      return NextResponse.json(
        {
          ok: false,
          code: "LLM_ERROR",
          message:
            "De AI kon geen blog genereren door een fout in het taalmodel.",
          action:
            "Probeer het later opnieuw. Als het probleem blijft terugkomen, neem contact op met de ondersteuning.",
        },
        { status: 500 }
      );
    }

    const content = generated.trim();

    const spec = buildBlogSpecV1(lengthMode);
    const quality = evaluateBlogQuality({
      text: content,
      spec,
      voiceCard,
      constraints: constraints as any,
    });

    if (quality.score < 0.5) {
      return NextResponse.json(
        {
          ok: false,
          code: "QUALITY_REJECTED",
          message:
            "De gegenereerde blog voldoet niet aan je profiel en contentregels.",
          action: "Pas je thought aan of verfijn je profiel.",
        },
        { status: 400 }
      );
    }

    const modelName = process.env.OPENAI_MODEL ?? FALLBACK_MODEL_NAME;

    const qualityToStore = {
      ...quality,
      specMeta: {
        version: spec.version,
        lengthMode: spec.lengthMode,
        minWords: spec.minWords,
        channel: "blog",
      },
    };

    const output = await prisma.output.create({
      data: {
        workspaceId,
        projectId: effectiveProjectId,
        channel: "blog",
        mode: "thought_to_post",
        inputJson: {
          thought: thought.trim(),
          length: lengthMode,
        },
        content,
        quality: qualityToStore,
        modelName,
        specVersion: "BlogSpecV1",
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

    console.error("[BLOG][GENERATE][POST] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Er is een onverwachte fout opgetreden bij het genereren van de blog.",
        action:
          "Probeer het opnieuw. Als het probleem blijft bestaan, vernieuw de pagina of neem contact op met de ondersteuning.",
      },
      { status: 500 }
    );
  }
}


