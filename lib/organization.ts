import { prisma } from "@/lib/prisma";
import { OrgRole } from "@prisma/client";

/**
 * Ensures the user is associated with an Organization and returns its id.
 *
 * - If the user already has at least one Membership, the oldest Organization is returned.
 * - If the user has no Memberships, a new Organization + OWNER Membership are created.
 */
export async function getOrCreateOrganizationForUser(
  userId: string
): Promise<string> {
  const existingMembership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      organizationId: true,
    },
  });

  if (existingMembership) {
    return existingMembership.organizationId;
  }

  // TODO: Improve organization naming (e.g. based on user profile or onboarding input).
  const organization = await prisma.organization.create({
    data: {
      name: "My organization",
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId,
      role: OrgRole.OWNER,
    },
  });

  return organization.id;
}

/**
 * Returns the current Organization id for the user, creating one if necessary.
 */
export async function getCurrentOrgId(userId: string): Promise<string> {
  return getOrCreateOrganizationForUser(userId);
}


