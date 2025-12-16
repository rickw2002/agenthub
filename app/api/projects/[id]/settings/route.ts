import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { useGlobalLibrary } = body ?? {};

    if (typeof useGlobalLibrary !== "boolean") {
      return NextResponse.json(
        { error: "useGlobalLibrary is verplicht en moet een boolean zijn" },
        { status: 400 }
      );
    }

    const orgId = await getCurrentOrgId(user.id);

    // Check that the project belongs to the current organization
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

    const settings = await prisma.projectSettings.upsert({
      where: {
        projectId: project.id,
      },
      create: {
        projectId: project.id,
        useGlobalLibrary,
      },
      update: {
        useGlobalLibrary,
      },
    });

    return NextResponse.json(
      {
        settings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][SETTINGS][PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het bijwerken van de projectinstellingen",
        details: message,
      },
      { status: 500 }
    );
  }
}


