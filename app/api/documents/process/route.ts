import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";

const DEFAULT_CHUNK_SIZE = 1000;

function createChunks(text: string, chunkSize: number = DEFAULT_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let index = 0;

  while (index < text.length) {
    chunks.push(text.slice(index, index + chunkSize));
    index += chunkSize;
  }

  return chunks;
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

    const { documentId, text } = body ?? {};

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "documentId is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    // Bepaal (of maak) workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(user.id);
    const orgId = await getCurrentOrgId(user.id);

    // Haal document op en controleer workspace- en organization-isolatie
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId: workspace.id,
        organizationId: orgId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document niet gevonden voor deze workspace" },
        { status: 404 }
      );
    }

    // Check if text is a placeholder or if file content is not available
    const isPlaceholderText = text.trim() === "[REPROCESS]" || text.trim() === "";
    const isLocalUpload = document.fileUrl?.startsWith("local-upload://");

    // If file content is not available, set status to failed and leave chunks unchanged
    if (isPlaceholderText && isLocalUpload) {
      await prisma.document.update({
        where: {
          id: document.id,
        },
        data: {
          status: "failed",
          error: "Bestandsinhoud is niet beschikbaar. Upload het document opnieuw om het te verwerken.",
        },
      });

      return NextResponse.json(
        {
          documentId: document.id,
          workspaceId: workspace.id,
          status: "failed",
          error: "Bestandsinhoud is niet beschikbaar. Upload het document opnieuw om het te verwerken.",
        },
        { status: 200 }
      );
    }

    // Start processing: set status to processing and clear error
    await prisma.document.update({
      where: {
        id: document.id,
      },
      data: {
        status: "processing",
        error: null,
      },
    });

    const chunks = createChunks(text);

    await prisma.$transaction(async (tx) => {
      // Verwijder bestaande chunks voor dit document (indien opnieuw verwerken)
      await tx.documentChunk.deleteMany({
        where: {
          documentId: document.id,
          workspaceId: workspace.id,
          organizationId: orgId,
        },
      });

      // Maak nieuwe chunks aan - copy scope, projectId, organizationId from document
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        // Placeholder embedding als string; later vervangen door echte pgvector
        const embeddingPlaceholder = null as string | null;

        await tx.documentChunk.create({
          data: {
            documentId: document.id,
            workspaceId: workspace.id,
            organizationId: document.organizationId,
            scope: document.scope,
            projectId: document.projectId,
            chunkIndex: i,
            text: chunkText,
            embedding: embeddingPlaceholder,
          },
        });
      }

      // Update document status naar ready
      await tx.document.update({
        where: {
          id: document.id,
        },
        data: {
          status: "ready",
          error: null,
        },
      });
    });

    return NextResponse.json(
      {
        documentId: document.id,
        workspaceId: workspace.id,
        chunks: chunks.length,
        status: "ready",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DOCUMENTS][PROCESS] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het verwerken van het document",
        details: message,
      },
      { status: 500 }
    );
  }
}


