import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/DashboardContent";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";
import { listFoundationAnswers } from "@/lib/bureauai/repo";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Zorg dat er altijd een workspace bestaat voor deze gebruiker
  const workspace = await getOrCreateWorkspace(session.user.id);

  // Check Bureau-AI profile completion
  // Een gebruiker heeft zijn profiel voltooid als:
  // 1. Er een ProfileCard bestaat (workspace-level), OF
  // 2. Alle foundation questions zijn beantwoord
  const [profileCard, foundationAnswers] = await Promise.all([
    prisma.profileCard.findFirst({
      where: {
        workspaceId: workspace.id,
        projectId: null,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
      },
    }),
    listFoundationAnswers({
      workspaceId: workspace.id,
      projectId: null,
    }),
  ]);

  const answeredKeys = new Set(
    foundationAnswers.map((a: { questionKey: string }) => a.questionKey)
  );
  const allFoundationsAnswered = FOUNDATIONS_KEYS.every((key) =>
    answeredKeys.has(key)
  );

  // Als er geen ProfileCard is EN niet alle foundation questions zijn beantwoord,
  // stuur de gebruiker naar personalisatie om hun profiel in te vullen
  if (!profileCard && !allFoundationsAnswered) {
    redirect("/account/personalization");
  }

  // Haal UserAgents op voor deze gebruiker
  const userAgents = await prisma.userAgent.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      agentTemplate: {
        select: {
          name: true,
          slug: true,
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Haal laatste 10 RunLogs op voor deze gebruiker
  const runLogs = await prisma.runLog.findMany({
    where: {
      userAgent: {
        userId: session.user.id,
      },
    },
    include: {
      userAgent: {
        select: {
          name: true,
          agentTemplate: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    <DashboardContent
      userName={session.user.name}
      userAgents={userAgents}
      runLogs={runLogs}
    />
  );
}
