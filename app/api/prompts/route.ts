import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const organizationId = await getCurrentOrgId(user.id);

    const prompts = await prisma.prompt.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ prompts }, { status: 200 });
  } catch (error) {
    console.error("[PROMPTS][GET] Error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van prompts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { title, body, tags } = json as {
      title?: unknown;
      body?: unknown;
      tags?: unknown;
    };

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return NextResponse.json(
        { error: "body is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    const organizationId = await getCurrentOrgId(user.id);

    const prompt = await prisma.prompt.create({
      data: {
        organizationId,
        title: title.trim(),
        body: body.trim(),
        tags: tags && typeof tags === "string" ? tags.trim() : "",
      },
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error("[PROMPTS][POST] Error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het aanmaken van de prompt" },
      { status: 500 }
    );
  }
}

