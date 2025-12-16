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

    // Fetch GLOBAL scope documents for current org
    const documents = await prisma.document.findMany({
      where: {
        organizationId: orgId,
        scope: "GLOBAL",
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
    console.error("[LIBRARY][DOCUMENTS][GET] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het ophalen van de bibliotheekdocumenten",
        details: message,
      },
      { status: 500 }
    );
  }
}

