import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

type RouteParams = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const promptId = params.id;

  if (!promptId || typeof promptId !== "string") {
    return NextResponse.json({ error: "Prompt id is verplicht" }, { status: 400 });
  }

  try {
    const organizationId = await getCurrentOrgId(user.id);

    // Check if prompt exists and belongs to organization
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: promptId,
        organizationId,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: "Prompt niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, body: bodyText, tags } = body as {
      title?: unknown;
      body?: unknown;
      tags?: unknown;
    };

    const updateData: {
      title?: string;
      body?: string;
      tags?: string;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "title mag niet leeg zijn" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (bodyText !== undefined) {
      if (typeof bodyText !== "string" || bodyText.trim().length === 0) {
        return NextResponse.json(
          { error: "body mag niet leeg zijn" },
          { status: 400 }
        );
      }
      updateData.body = bodyText.trim();
    }

    if (tags !== undefined) {
      updateData.tags = tags && typeof tags === "string" ? tags.trim() : "";
    }

    const prompt = await prisma.prompt.update({
      where: { id: promptId },
      data: updateData,
    });

    return NextResponse.json({ prompt }, { status: 200 });
  } catch (error) {
    console.error("[PROMPTS][PATCH] Error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het bijwerken van de prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const promptId = params.id;

  if (!promptId || typeof promptId !== "string") {
    return NextResponse.json({ error: "Prompt id is verplicht" }, { status: 400 });
  }

  try {
    const organizationId = await getCurrentOrgId(user.id);

    // Check if prompt exists and belongs to organization
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: promptId,
        organizationId,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: "Prompt niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    await prisma.prompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PROMPTS][DELETE] Error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het verwijderen van de prompt" },
      { status: 500 }
    );
  }
}

