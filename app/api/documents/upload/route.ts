import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) ?? file?.name ?? "Onbenoemd document";
    const projectIdParam = formData.get("projectId") as string | null;
    const scopeParam = formData.get("scope") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Bestand (file) is verplicht" },
        { status: 400 }
      );
    }

    // Bepaal (of maak) workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(user.id);
    const orgId = await getCurrentOrgId(user.id);

    // Determine scope and projectId
    let projectId: string | null = null;
    let scope: "GLOBAL" | "PROJECT";

    if (scopeParam === "GLOBAL") {
      scope = "GLOBAL";
      projectId = null;
    } else if (scopeParam === "PROJECT" || projectIdParam) {
      scope = "PROJECT";
      
      // If scope is PROJECT, projectId must be provided
      if (!projectIdParam) {
        return NextResponse.json(
          { error: "projectId is verplicht wanneer scope=PROJECT" },
          { status: 400 }
        );
      }

      // Validate projectId belongs to current org
      const project = await prisma.project.findFirst({
        where: {
          id: projectIdParam,
          organizationId: orgId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project niet gevonden voor deze organisatie" },
          { status: 404 }
        );
      }

      projectId = projectIdParam;
    } else {
      return NextResponse.json(
        { error: "scope (GLOBAL of PROJECT) of projectId is verplicht" },
        { status: 400 }
      );
    }

    // Voor nu slaan we het bestand niet fysiek op, maar bewaren we alleen metadata
    const fileUrl = `local-upload://${encodeURIComponent(file.name)}`;

    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        organizationId: orgId,
        scope,
        projectId,
        title,
        fileUrl,
        status: "uploaded",
      },
    });

    return NextResponse.json(
      {
        documentId: document.id,
        workspaceId: document.workspaceId,
        status: document.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[DOCUMENTS][UPLOAD] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      { error: "Er is iets misgegaan bij het uploaden van het document", details: message },
      { status: 500 }
    );
  }
}


