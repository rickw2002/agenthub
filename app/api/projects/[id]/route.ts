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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      include: {
        settings: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        project,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van het project",
        details: message,
      },
      { status: 500 }
    );
  }
}

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

    const { name, isArchived } = body ?? {};

    if (
      (name === undefined || name === null) &&
      (isArchived === undefined || isArchived === null)
    ) {
      return NextResponse.json(
        { error: "Minimaal één veld (name of isArchived) is verplicht" },
        { status: 400 }
      );
    }

    const data: {
      name?: string;
      isArchived?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name moet een niet-lege string zijn" },
          { status: 400 }
        );
      }
      data.name = name.trim();
    }

    if (isArchived !== undefined) {
      if (typeof isArchived !== "boolean") {
        return NextResponse.json(
          { error: "isArchived moet een boolean zijn" },
          { status: 400 }
        );
      }
      data.isArchived = isArchived;
    }

    const orgId = await getCurrentOrgId(user.id);

    // Enforce org ownership by checking organizationId in the update condition
    const project = await prisma.project.updateMany({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      data,
    });

    if (project.count === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    const updatedProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json(
      {
        project: updatedProject,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het bijwerken van het project",
        details: message,
      },
      { status: 500 }
    );
  }
}


