import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { buildDocumentRagPrompt, RagOutputMode } from "@/lib/documentRagPrompt";
import { getOrCreateWorkspace } from "@/lib/workspace";

const DEFAULT_MODE: RagOutputMode = "qa";

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

    const { question, documentId, mode } = body ?? {};

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "question is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    const outputMode: RagOutputMode =
      mode && ["summary", "plan", "checklist", "qa"].includes(mode)
        ? mode
        : DEFAULT_MODE;

    // Bepaal (of maak) workspace op basis van ingelogde user
    const workspace = await getOrCreateWorkspace(user.id);

    let targetDocument: { id: string; title: string } | null = null;

    if (documentId) {
      if (typeof documentId !== "string") {
        return NextResponse.json(
          { error: "documentId moet een string zijn" },
          { status: 400 }
        );
      }

      const doc = await prisma.document.findFirst({
        where: {
          id: documentId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!doc) {
        return NextResponse.json(
          { error: "Document niet gevonden voor deze workspace" },
          { status: 404 }
        );
      }

      targetDocument = doc;
    }

    // Simpele retrieval: zoek relevante chunks binnen de workspace (en optioneel document)
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5);

    let chunks = await prisma.documentChunk.findMany({
      where: {
        workspaceId: workspace.id,
        ...(targetDocument
          ? { documentId: targetDocument.id }
          : {}),
        ...(keywords.length > 0
          ? {
              OR: keywords.map((word) => ({
                text: { contains: word, mode: "insensitive" as const },
              })),
            }
          : {}),
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
    });

    // Fallback: als er niets matcht op keywords, pak enkele recente chunks
    if (chunks.length === 0) {
      chunks = await prisma.documentChunk.findMany({
        where: {
          workspaceId: workspace.id,
          ...(targetDocument
            ? { documentId: targetDocument.id }
            : {}),
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });
    }

    const workspaceContext = await prisma.workspaceContext.findUnique({
      where: {
        workspaceId: workspace.id,
      },
      select: {
        profileJson: true,
        goalsJson: true,
        preferencesJson: true,
      },
    });

    const prompt = buildDocumentRagPrompt({
      question: question.trim(),
      mode: outputMode,
      workspaceContext: workspaceContext ?? null,
      chunks: chunks.map((c) => ({
        documentId: c.document.id,
        documentTitle: c.document.title,
        chunkIndex: c.chunkIndex,
        text: c.text,
      })),
    });

    // Simpele, deterministische "antwoord" placeholder op basis van mode
    let simulatedAnswer: string;
    if (chunks.length === 0) {
      simulatedAnswer =
        "Ik heb nog geen relevante documentfragmenten gevonden in je workspace. Voeg eerst documenten toe en verwerk ze, en stel daarna je vraag opnieuw.";
    } else if (outputMode === "summary") {
      simulatedAnswer =
        "Korte samenvatting op basis van de geselecteerde documenten: de belangrijkste punten gaan over de onderwerpen die in de fragmenten worden genoemd. Gebruik deze samenvatting als startpunt en verfijn indien nodig.";
    } else if (outputMode === "plan") {
      simulatedAnswer =
        "Actieplan (voorbeeld):\n1) Bepaal het concrete doel uit je vraag.\n2) Gebruik de belangrijkste inzichten uit de documentfragmenten.\n3) Vertaal die inzichten naar 3–5 concrete acties.\n4) Plan wie wat doet en wanneer.\n5) Evalueer na 1–2 weken en stuur bij.";
    } else if (outputMode === "checklist") {
      simulatedAnswer =
        "Checklist (voorbeeld):\n- [ ] Lees de belangrijkste documentfragmenten door.\n- [ ] Noteer 3 concrete verbeterpunten.\n- [ ] Wijs acties toe aan teamleden.\n- [ ] Plan een reviewmoment.\n- [ ] Documenteer de resultaten in je workspace.";
    } else {
      simulatedAnswer =
        "Op basis van de gevonden fragmenten kun je een kort, concreet antwoord formuleren dat direct ingaat op je vraag. Focus op 1–3 belangrijkste inzichten uit de documenten en koppel die aan je doelen.";
    }

    return NextResponse.json(
      {
        question: question.trim(),
        mode: outputMode,
        workspaceId: workspace.id,
        documentId: targetDocument?.id ?? null,
        retrievedChunks: chunks.map((c) => ({
          id: c.id,
          documentId: c.document.id,
          documentTitle: c.document.title,
          chunkIndex: c.chunkIndex,
        })),
        prompt,
        answer: simulatedAnswer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DOCUMENTS][ASK] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het beantwoorden van de documentvraag",
        details: message,
      },
      { status: 500 }
    );
  }
}


