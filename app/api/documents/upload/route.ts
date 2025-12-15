import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

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

    if (!file) {
      return NextResponse.json(
        { error: "Bestand (file) is verplicht" },
        { status: 400 }
      );
    }

    // Bepaal (of maak) workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(user.id);

    // Voor nu slaan we het bestand niet fysiek op, maar bewaren we alleen metadata
    const fileUrl = `local-upload://${encodeURIComponent(file.name)}`;

    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        title,
        fileUrl,
        status: "pending",
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


