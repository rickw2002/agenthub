import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";
import { supabaseAdmin } from "@/lib/supabase";

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

    return NextResponse.json(
      {
        documentId: document.id,
        workspaceId: workspace.id,
        status: "disabled",
        error: "Documentverwerking is uitgeschakeld in deze omgeving.",
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


