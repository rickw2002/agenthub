import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/DashboardContent";
import { getOrCreateWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Zorg dat er altijd een workspace bestaat voor deze gebruiker
  const workspace = await getOrCreateWorkspace(session.user.id);

  const workspaceContext = await prisma.workspaceContext.findUnique({
    where: {
      workspaceId: workspace.id,
    },
  });

  if (
    !workspaceContext ||
    (workspaceContext.profileJson === "{}" &&
      workspaceContext.goalsJson === "{}" &&
      workspaceContext.preferencesJson === "{}")
  ) {
    redirect("/onboarding");
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
