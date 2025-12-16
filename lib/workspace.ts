import { prisma } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/organization";

/**
 * Haalt de workspace op voor een gegeven userId.
 * Bestaat er nog geen workspace, dan wordt er één aangemaakt.
 *
 * Bij het aanmaken of ophalen wordt ervoor gezorgd dat er een Organization bestaat
 * en wordt de workspace gekoppeld aan die Organization (inclusief eenmalige backfill).
 */
export async function getOrCreateWorkspace(userId: string) {
  const orgId = await getCurrentOrgId(userId);

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
    if (!existing.organizationId) {
      const updated = await prisma.workspace.update({
        where: { id: existing.id },
        data: { organizationId: orgId },
      });
      return updated;
    }

    return existing;
  }

  // Maak een nieuwe workspace aan als er nog geen bestaat
  const workspace = await prisma.workspace.create({
    data: {
      ownerId: userId,
      name: "Mijn workspace",
      organizationId: orgId,
    },
  });

  return workspace;
}

