import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";
import { supabaseAdmin } from "@/lib/supabase";
import { extractTextFromFile } from "@/lib/text-extraction";

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

    const { documentId } = body ?? {};

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "documentId is verplicht en moet een string zijn" },
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

    if (!document.fileUrl) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: "Bestands-URL ontbreekt. Upload het document opnieuw.",
        },
      });
      return NextResponse.json(
        { error: "Bestands-URL ontbreekt" },
        { status: 400 }
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

    // Download file from Supabase Storage
    const bucketName = "documents";
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucketName)
      .download(document.fileUrl);

    if (downloadError || !fileData) {
      console.error("[DOCUMENTS][PROCESS] Error downloading file:", downloadError);
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: `Bestand kon niet worden gedownload: ${downloadError?.message || "Unknown error"}`,
        },
      });
      return NextResponse.json(
        {
          documentId: document.id,
          workspaceId: workspace.id,
          status: "failed",
          error: downloadError?.message || "Failed to download file",
        },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Extract text from file
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, document.title);
    } catch (extractionError) {
      console.error("[DOCUMENTS][PROCESS] Error extracting text:", extractionError);
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: `Tekstextractie mislukt: ${extractionError instanceof Error ? extractionError.message : "Unknown error"}`,
        },
      });
      return NextResponse.json(
        {
          documentId: document.id,
          workspaceId: workspace.id,
          status: "failed",
          error: extractionError instanceof Error ? extractionError.message : "Text extraction failed",
        },
        { status: 500 }
      );
    }

    // Check if extracted text is too short (likely scanned document or empty)
    if (extractedText.trim().length < 500) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "failed",
          error: "Geen leesbare tekst gevonden. Mogelijk gescand document (OCR nodig).",
        },
      });
      return NextResponse.json(
        {
          documentId: document.id,
          workspaceId: workspace.id,
          status: "failed",
          error: "Geen leesbare tekst gevonden. Mogelijk gescand document (OCR nodig).",
        },
        { status: 200 }
      );
    }

    const chunks = createChunks(extractedText);

    await prisma.$transaction(async (tx) => {
      // Delete old chunks for this document
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


