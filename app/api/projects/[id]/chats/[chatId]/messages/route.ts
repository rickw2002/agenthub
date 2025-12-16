import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

type RouteParams = {
  params: {
    id: string;
    chatId: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const projectId = params.id;
  const chatId = params.chatId;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json(
      { error: "Project id is verplicht" },
      { status: 400 }
    );
  }

  if (!chatId || typeof chatId !== "string") {
    return NextResponse.json(
      { error: "Chat id is verplicht" },
      { status: 400 }
    );
  }

  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const orgId = await getCurrentOrgId(user.id);

    // Validate project belongs to current org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    // Fetch chat and validate it belongs to this project
    const chat = await prisma.projectChat.findFirst({
      where: {
        id: chatId,
        projectId: projectId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat niet gevonden voor dit project" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        messages: chat.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sourcesJson: msg.sourcesJson,
          metaJson: msg.metaJson,
          createdAt: msg.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][CHATS][MESSAGES][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van de chatberichten",
        details: message,
      },
      { status: 500 }
    );
  }
}

