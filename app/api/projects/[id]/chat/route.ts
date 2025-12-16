import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const projectId = params.id;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json(
      { error: "Project id is verplicht" },
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

    // Fetch chats for this project
    const chats = await prisma.projectChat.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        chats: chats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messageCount: chat._count.messages,
        })),
        count: chats.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][CHAT][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van de chats",
        details: message,
      },
      { status: 500 }
    );
  }
}

