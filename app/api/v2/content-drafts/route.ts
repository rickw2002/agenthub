import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// GET /api/v2/content-drafts
export async function GET(_request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    const drafts = await prisma.contentDraftV2.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        feedbacks: true,
      },
    });

    return NextResponse.json({ ok: true, drafts }, { status: 200 });
  } catch (error) {
    console.error("[CONTENT_V2][GET] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Er is iets misgegaan bij het ophalen van content drafts" },
      { status: 500 }
    );
  }
}

// POST /api/v2/content-drafts  -> Genereer 3 LinkedIn posts op basis van laatste InsightV2 + VoiceCard
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    // Optioneel: body kan later extra opties bevatten (nu genegeerd)
    // Body parsing skipped for now - future enhancement

    // 1) Haal laatste InsightV2 op
    const latestInsight = await prisma.insightV2.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    });

    if (!latestInsight) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geen InsightV2 gevonden voor deze workspace. Genereer eerst een insight voordat je content aanmaakt.",
        },
        { status: 400 }
      );
    }

    // 2) Haal laatste ProfileCard (VoiceCard JSON) op
    const profileCard = await prisma.profileCard.findFirst({
      where: { workspaceId: workspace.id, projectId: null },
      orderBy: { version: "desc" },
    });

    const voiceCardVersion =
      profileCard?.voiceCard ??
      ({
        // fallback leeg profiel
        toneDirectness: 0.5,
        toneFormality: 0.5,
        toneLength: "medium",
      } as unknown);

    // 3) Parse opportunities uit InsightV2
    let opportunities: any[] = [];
    try {
      // Prisma Json -> already parsed in TS types, maar cast naar any[]
      const rawOpps = latestInsight.opportunities as unknown;
      if (Array.isArray(rawOpps)) {
        opportunities = rawOpps;
      }
    } catch {
      opportunities = [];
    }

    if (opportunities.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "InsightV2 heeft geen opportunities. Genereer eerst een insight met opportunities.",
        },
        { status: 400 }
      );
    }

    const selectedOpps = opportunities.slice(0, 3);
    const formats: Array<"story" | "insight" | "list"> = ["story", "insight", "list"];

    const createdDrafts = [];

    for (let i = 0; i < selectedOpps.length; i++) {
      const opp = selectedOpps[i] || {};
      const format = formats[i] ?? "insight";

      const title: string =
        typeof opp.topic === "string" && opp.topic.trim().length > 0
          ? opp.topic
          : `Opportunity ${i + 1}`;

      const angle: string =
        typeof opp.angle === "string" && opp.angle.trim().length > 0
          ? opp.angle
          : "Relevante invalshoek voor jouw doelgroep.";

      const whyNow: string =
        typeof opp.whyNow === "string" && opp.whyNow.trim().length > 0
          ? opp.whyNow
          : "Leg uit waarom dit nu belangrijk is voor de lezer.";

      const ctaStyle: string =
        typeof opp.ctaStyle === "string" && opp.ctaStyle.trim().length > 0
          ? opp.ctaStyle
          : "zachte_call_to_action";

      const oppSignalIds: string[] = Array.isArray(opp.signalIds)
        ? opp.signalIds.filter((id: unknown) => typeof id === "string")
        : [];

      const baseBody = [
        `📌 ${title}`,
        "",
        `Kern-invalshoek: ${angle}`,
        "",
        `Waarom nu: ${whyNow}`,
        "",
        `Call-to-action stijl: ${ctaStyle}`,
        "",
        "👉 Werk deze post uit in jouw eigen woorden, of laat de AI hem verder aanscherpen.",
      ].join("\n");

      const sources = {
        insightId: latestInsight.id,
        insightSources: latestInsight.sources,
        opportunityIndex: i,
        opportunitySignalIds: oppSignalIds,
      };

      const draft = await prisma.contentDraftV2.create({
        data: {
          workspaceId: workspace.id,
          type: "LINKEDIN_POST",
          title,
          body: baseBody,
          format,
          voiceCardVersion: voiceCardVersion as any,
          basedOnInsightId: latestInsight.id,
          sources,
          status: "DRAFT",
        },
      });

      createdDrafts.push(draft);
    }

    return NextResponse.json(
      {
        ok: true,
        created: createdDrafts.length,
        drafts: createdDrafts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CONTENT_V2][POST] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Er is iets misgegaan bij het genereren van LinkedIn drafts",
      },
      { status: 500 }
    );
  }
}


