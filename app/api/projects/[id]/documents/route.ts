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

    // Fetch PROJECT scope documents for this project
    const documents = await prisma.document.findMany({
      where: {
        organizationId: orgId,
        projectId: projectId,
        scope: "PROJECT",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        documents: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          fileUrl: doc.fileUrl,
          status: doc.status,
          error: doc.error,
          scope: doc.scope,
          projectId: doc.projectId,
          createdAt: doc.createdAt,
          chunkCount: doc._count.chunks,
        })),
        count: documents.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROJECTS][DOCUMENTS][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van de projectdocumenten",
        details: message,
      },
      { status: 500 }
    );
  }
}

