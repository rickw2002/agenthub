import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v2/weekly-reports
 * Returns all WeeklyReportV2 for the current user's workspace.
 */
export async function GET(request: NextRequest) {
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

    const reports = await prisma.weeklyReportV2.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: {
        weekStart: "desc",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        reports: reports.map((r) => ({
          id: r.id,
          workspaceId: r.workspaceId,
          weekStart: r.weekStart.toISOString(),
          weekEnd: r.weekEnd.toISOString(),
          summary: r.summary,
          scoreboard: r.scoreboard,
          insights: r.insights,
          decisions: r.decisions,
          risks: r.risks,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[WEEKLY_REPORTS_V2] GET error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van weekly reports" },
      { status: 500 }
    );
  }
}

