import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AgentDetail from "@/components/AgentDetail";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function AgentDetailPage({ params }: PageProps) {
  const agent = await prisma.agentTemplate.findUnique({
    where: { slug: params.slug },
  });

  if (!agent) {
    notFound();
  }

  return <AgentDetail agent={agent} />;
}









