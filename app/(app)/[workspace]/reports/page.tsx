import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import WeeklyReportsV2 from "@/components/WeeklyReportsV2";

interface PageProps {
  params: {
    workspace: string;
  };
}

export default async function WorkspaceReportsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const workspace = await getOrCreateWorkspace(session.user.id);

  // Fetch all WeeklyReportV2 for this workspace
  const reports = await prisma.weeklyReportV2.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      weekStart: "desc",
    },
  });

  return (
    <WeeklyReportsV2
      workspaceId={workspace.id}
      initialReports={reports.map((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        weekStart: r.weekStart.toISOString(),
        weekEnd: r.weekEnd.toISOString(),
        summary: r.summary,
        scoreboard: r.scoreboard as any,
        insights: r.insights as any,
        decisions: r.decisions as any,
        risks: r.risks as any,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}

