import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import ContentStudioV2 from "@/components/ContentStudioV2";

interface PageProps {
  params: {
    workspace: string;
  };
}

export const dynamic = "force-dynamic";

export default async function WorkspaceContentPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const workspace = await getOrCreateWorkspace(session.user.id);

  // Voor nu negeren we params.workspace en gebruiken we de workspace van de ingelogde user

  const drafts = await prisma.contentDraftV2.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      feedbacks: true,
    },
  });

  return (
    <ContentStudioV2
      workspaceId={workspace.id}
      initialDrafts={JSON.parse(JSON.stringify(drafts))}
    />
  );
}


