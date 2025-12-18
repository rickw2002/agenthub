import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  resolveWorkspaceProjectContext,
  BureauAIErrorImpl,
} from "@/lib/bureauai/tenancy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Je moet ingelogd zijn om outputs op te halen.",
        },
        { status: 401 }
      );
    }

    const workspace = await getOrCreateWorkspace(session.user.id);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // favorites | all | sources
    const search = searchParams.get("search") || "";
    const postType = searchParams.get("postType") || "";
    const funnelPhase = searchParams.get("funnelPhase") || "";
    const mode = searchParams.get("mode") || ""; // brainstorm | thought_to_post
    const channel = searchParams.get("channel") || ""; // linkedin | blog
    const projectIdParam = searchParams.get("projectId");

    const { projectId: effectiveProjectId } =
      await resolveWorkspaceProjectContext(projectIdParam ?? null);

    // Build where clause
    const where: any = {
      workspaceId: workspace.id,
    };

    if (effectiveProjectId) {
      where.projectId = effectiveProjectId;
    } else {
      where.projectId = null;
    }

    if (channel) {
      where.channel = channel.toUpperCase();
    }

    if (mode) {
      where.mode = mode.toUpperCase().replace("-", "_");
    }

    // Get outputs
    let outputs = await prisma.output.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to 100 most recent
    });

    // Filter by favorites (stored in inputJson)
    if (filter === "favorites") {
      outputs = outputs.filter((output) => {
        const inputJson = output.inputJson as any;
        return inputJson?.isFavorite === true;
      });
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      outputs = outputs.filter(
        (output) =>
          output.content.toLowerCase().includes(searchLower) ||
          JSON.stringify(output.inputJson)
            .toLowerCase()
            .includes(searchLower)
      );
    }

    // Filter by postType and funnelPhase from inputJson
    if (postType || funnelPhase) {
      outputs = outputs.filter((output) => {
        const inputJson = output.inputJson as any;
        if (postType && inputJson?.postType !== postType) return false;
        if (funnelPhase && inputJson?.funnelPhase !== funnelPhase) return false;
        return true;
      });
    }

    // Format outputs for response
    const formattedOutputs = outputs.map((output) => {
      const inputJson = output.inputJson as any;
      return {
        id: output.id,
        channel: output.channel,
        mode: output.mode,
        content: output.content,
        inputJson: {
          thought: inputJson?.thought || "",
          topic: inputJson?.topic || "",
          postType: inputJson?.postType || null,
          funnelPhase: inputJson?.funnelPhase || null,
          length: inputJson?.length || null,
          isFavorite: inputJson?.isFavorite || false,
        },
        quality: output.quality,
        profileCardVersion: output.profileCardVersion,
        createdAt: output.createdAt.toISOString(),
      };
    });

    return NextResponse.json(
      {
        ok: true,
        outputs: formattedOutputs,
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

    console.error("[OUTPUTS][GET] Unexpected error:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Er is een onverwachte fout opgetreden bij het ophalen van outputs.",
      },
      { status: 500 }
    );
  }
}

