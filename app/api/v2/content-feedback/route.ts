import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// POST /api/v2/content-feedback
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ongeldig JSON-formaat in body" },
        { status: 400 }
      );
    }

    const {
      contentDraftId,
      postedUrl,
      impressions,
      clicks,
      reactions,
      comments,
      qualitativeRating,
      notes,
    } = body ?? {};

    if (!contentDraftId || typeof contentDraftId !== "string") {
      return NextResponse.json(
        { error: "contentDraftId is verplicht" },
        { status: 400 }
      );
    }

    // Zorg dat draft bij deze workspace hoort
    const draft = await prisma.contentDraftV2.findFirst({
      where: {
        id: contentDraftId,
        workspaceId: workspace.id,
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft niet gevonden of geen rechten" },
        { status: 404 }
      );
    }

    const feedback = await prisma.contentFeedbackV2.create({
      data: {
        workspaceId: workspace.id,
        contentDraftId,
        postedUrl: typeof postedUrl === "string" ? postedUrl : null,
        impressions:
          typeof impressions === "number" && Number.isFinite(impressions)
            ? impressions
            : null,
        clicks:
          typeof clicks === "number" && Number.isFinite(clicks)
            ? clicks
            : null,
        reactions:
          typeof reactions === "number" && Number.isFinite(reactions)
            ? reactions
            : null,
        comments:
          typeof comments === "number" && Number.isFinite(comments)
            ? comments
            : null,
        qualitativeRating:
          typeof qualitativeRating === "string" &&
          ["GOOD", "OK", "BAD"].includes(qualitativeRating)
            ? qualitativeRating
            : null,
        notes: typeof notes === "string" ? notes : null,
      },
    });

    return NextResponse.json({ ok: true, feedback }, { status: 200 });
  } catch (error) {
    console.error("[CONTENT_V2][FEEDBACK][POST] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Er is iets misgegaan bij het opslaan van feedback" },
      { status: 500 }
    );
  }
}


