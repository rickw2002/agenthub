import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

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

    // Haal document op en controleer workspace-isolatie
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId: workspace.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document niet gevonden voor deze workspace" },
        { status: 404 }
      );
    }

    const chunks = createChunks(text);

    await prisma.$transaction(async (tx) => {
      // Verwijder bestaande chunks voor dit document (indien opnieuw verwerken)
      await tx.documentChunk.deleteMany({
        where: {
          documentId: document.id,
          workspaceId: workspace.id,
        },
      });

      // Maak nieuwe chunks aan
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        // Placeholder embedding als string; later vervangen door echte pgvector
        const embeddingPlaceholder = null as string | null;

        await tx.documentChunk.create({
          data: {
            documentId: document.id,
            workspaceId: workspace.id,
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


