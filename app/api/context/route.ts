import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Bepaal (of maak) huidige workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(session.user.id);

    const workspaceContext = await prisma.workspaceContext.findUnique({
      where: {
        workspaceId: workspace.id,
      },
    });

    if (!workspaceContext) {
      return NextResponse.json(
        { error: "Geen workspace context gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspaceId: workspace.id,
      profileJson: workspaceContext.profileJson,
      goalsJson: workspaceContext.goalsJson,
      preferencesJson: workspaceContext.preferencesJson,
      createdAt: workspaceContext.createdAt,
      updatedAt: workspaceContext.updatedAt,
    });
  } catch (error) {
    console.error("[CONTEXT][GET] Error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van de context" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let debugUserId: string | null = null;
  let debugWorkspaceId: string | null = null;
  let debugBody: any = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    debugUserId = session.user.id;

    const body = await request.json();
    debugBody = body;
    const { profileJson, goalsJson, preferencesJson } = body ?? {};

    // Bepaal (of maak) huidige workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(session.user.id);
    debugWorkspaceId = workspace.id;

    const updateData: {
      profileJson?: string;
      goalsJson?: string;
      preferencesJson?: string;
    } = {};

    if (profileJson !== undefined) {
      updateData.profileJson =
        typeof profileJson === "string"
          ? profileJson
          : JSON.stringify(profileJson);
    }

    if (goalsJson !== undefined) {
      updateData.goalsJson =
        typeof goalsJson === "string" ? goalsJson : JSON.stringify(goalsJson);
    }

    if (preferencesJson !== undefined) {
      updateData.preferencesJson =
        typeof preferencesJson === "string"
          ? preferencesJson
          : JSON.stringify(preferencesJson);
    }

    const workspaceContext = await prisma.workspaceContext.upsert({
      where: {
        workspaceId: workspace.id,
      },
      create: {
        workspaceId: workspace.id,
        profileJson: updateData.profileJson ?? "{}",
        goalsJson: updateData.goalsJson ?? "{}",
        preferencesJson: updateData.preferencesJson ?? "{}",
      },
      update: updateData,
    });

    return NextResponse.json({
      workspaceId: workspace.id,
      profileJson: workspaceContext.profileJson,
      goalsJson: workspaceContext.goalsJson,
      preferencesJson: workspaceContext.preferencesJson,
      createdAt: workspaceContext.createdAt,
      updatedAt: workspaceContext.updatedAt,
    });
  } catch (error) {
    console.error("[CONTEXT][PATCH] Error:", error);
    console.error("[CONTEXT][PATCH] Debug context:", {
      userId: debugUserId,
      workspaceId: debugWorkspaceId,
      body: debugBody,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het updaten van de context",
        details: message,
      },
      { status: 500 }
    );
  }
}


