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
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { profileJson, goalsJson, preferencesJson } = body ?? {};

    // Bepaal (of maak) huidige workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(session.user.id);

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

    const workspaceContext = await prisma.workspaceContext.update({
      where: {
        workspaceId: workspace.id,
      },
      data: updateData,
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
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het updaten van de context" },
      { status: 500 }
    );
  }
}


