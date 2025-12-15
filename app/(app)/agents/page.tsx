import { prisma } from "@/lib/prisma";
import AgentsCatalog from "@/components/AgentsCatalog";

export default async function AgentsPage() {
  // Haal alle AgentTemplates op uit de database
  const agentTemplates = await prisma.agentTemplate.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Agents Catalogus</h1>
      <p className="text-gray-600 mb-6">
        Ontdek en activeer AI agents en workflows om je bedrijfsprocessen te automatiseren.
      </p>
      <AgentsCatalog agents={agentTemplates} />
    </div>
  );
}
