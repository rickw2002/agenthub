import { prisma } from "@/lib/prisma";

/**
 * Haalt de workspace op voor een gegeven userId.
 * Bestaat er nog geen workspace, dan wordt er één aangemaakt.
 */
export async function getOrCreateWorkspace(userId: string) {
  // Zoek bestaande workspace
  const existing = await prisma.workspace.findFirst({
    where: {
      ownerId: userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  // Maak een nieuwe workspace aan als er nog geen bestaat
  const workspace = await prisma.workspace.create({
    data: {
      ownerId: userId,
      name: "Mijn workspace",
    },
  });

  return workspace;
}


