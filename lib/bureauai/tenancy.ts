import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";
import { getOrCreateWorkspace } from "@/lib/workspace";

export type BureauAIErrorCode =
  | "UNAUTHENTICATED"
  | "PROJECT_NOT_IN_ORG"
  | "INTERNAL_ERROR";

export type BureauAIError = {
  code: BureauAIErrorCode;
  message: string;
  action?: string;
  status: number;
};

export class BureauAIErrorImpl extends Error implements BureauAIError {
  code: BureauAIErrorCode;
  action?: string;
  status: number;

  constructor(error: BureauAIError) {
    super(error.message);
    this.code = error.code;
    this.action = error.action;
    this.status = error.status;
    this.name = "BureauAIError";
  }
}

export async function getCurrentContext() {
  const authError = await requireAuth();
  if (authError) {
    throw new BureauAIErrorImpl({
      code: "UNAUTHENTICATED",
      message: "Je bent niet ingelogd.",
      action: "Log opnieuw in en probeer het nog eens.",
      status: 401,
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new BureauAIErrorImpl({
      code: "UNAUTHENTICATED",
      message: "Geen geldige gebruikerssessie gevonden.",
      action: "Log opnieuw in en probeer het nog eens.",
      status: 401,
    });
  }

  const userId = user.id;
  const orgId = await getCurrentOrgId(userId);
  const workspace = await getOrCreateWorkspace(userId);

  return {
    userId,
    orgId,
    workspaceId: workspace.id,
  };
}

export async function assertProjectInOrg(projectId: string, orgId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: orgId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new BureauAIErrorImpl({
      code: "PROJECT_NOT_IN_ORG",
      message: "Project niet gevonden voor deze organisatie.",
      action: "Controleer of je het juiste project hebt geselecteerd.",
      status: 404,
    });
  }
}

export async function resolveWorkspaceProjectContext(
  projectId?: string | null
) {
  const { userId, orgId, workspaceId } = await getCurrentContext();

  let effectiveProjectId: string | null = null;

  if (projectId) {
    await assertProjectInOrg(projectId, orgId);
    effectiveProjectId = projectId;
  }

  return {
    userId,
    orgId,
    workspaceId,
    projectId: effectiveProjectId,
  };
}


