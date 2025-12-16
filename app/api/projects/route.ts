import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

export async function GET() {
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

    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        isArchived: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json(
      {
        projects,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van de projecten",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { name, description } = body ?? {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    if (description !== undefined && typeof description !== "string") {
      return NextResponse.json(
        { error: "description moet een string zijn als deze wordt meegegeven" },
        { status: 400 }
      );
    }

    const orgId = await getCurrentOrgId(user.id);

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        description: description ?? null,
        settings: {
          create: {
            // useGlobalLibrary default is true, expliciet voor duidelijkheid
            useGlobalLibrary: true,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json(
      {
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PROJECTS][POST] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het aanmaken van het project",
        details: message,
      },
      { status: 500 }
    );
  }
}


