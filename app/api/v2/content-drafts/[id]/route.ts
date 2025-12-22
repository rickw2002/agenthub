import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

// PATCH /api/v2/content-drafts/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Draft ID ontbreekt" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ongeldig JSON-formaat in body" },
        { status: 400 }
      );
    }

    const data: any = {};

    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.body === "string") data.body = body.body;
    if (
      typeof body.status === "string" &&
      ["DRAFT", "APPROVED", "POSTED"].includes(body.status)
    ) {
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Geen geldige velden om te updaten" },
        { status: 400 }
      );
    }

    const updated = await prisma.contentDraftV2.updateMany({
      where: {
        id,
        workspaceId: workspace.id,
      },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Draft niet gevonden of geen rechten" },
        { status: 404 }
      );
    }

    const draft = await prisma.contentDraftV2.findUnique({
      where: { id },
      include: { feedbacks: true },
    });

    return NextResponse.json({ ok: true, draft }, { status: 200 });
  } catch (error) {
    console.error("[CONTENT_V2][PATCH] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Er is iets misgegaan bij het updaten van de draft" },
      { status: 500 }
    );
  }
}


