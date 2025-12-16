import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const documentId = params.id;

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json(
      { error: "Document id is verplicht" },
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

    // Verify document belongs to current org
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    // Delete document and chunks (cascade will handle chunks, but we'll do it explicitly for clarity)
    await prisma.$transaction(async (tx) => {
      // Delete chunks first (though cascade should handle this)
      await tx.documentChunk.deleteMany({
        where: {
          documentId: documentId,
          organizationId: orgId,
        },
      });

      // Delete document
      await tx.document.delete({
        where: {
          id: documentId,
        },
      });
    });

    return NextResponse.json(
      {
        message: "Document en chunks succesvol verwijderd",
        deletedDocumentId: documentId,
        deletedChunkCount: document._count.chunks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DOCUMENTS][DELETE] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het verwijderen van het document",
        details: message,
      },
      { status: 500 }
    );
  }
}

