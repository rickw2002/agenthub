import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

/**
 * GET /api/v2/weekly-reports/[id]
 * Returns a single WeeklyReportV2 by ID (must belong to user's workspace).
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    const report = await prisma.weeklyReportV2.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Weekly report niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        report: {
          id: report.id,
          workspaceId: report.workspaceId,
          weekStart: report.weekStart.toISOString(),
          weekEnd: report.weekEnd.toISOString(),
          summary: report.summary,
          scoreboard: report.scoreboard,
          insights: report.insights,
          decisions: report.decisions,
          risks: report.risks,
          createdAt: report.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[WEEKLY_REPORTS_V2] GET [id] error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van de weekly report" },
      { status: 500 }
    );
  }
}

