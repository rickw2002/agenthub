import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userAgentId, input } = (body || {}) as {
    userAgentId?: unknown;
    input?: unknown;
  };

  if (!userAgentId || typeof userAgentId !== "string") {
    return NextResponse.json({ error: "userAgentId is required and must be a string" }, { status: 400 });
  }

  // Load UserAgent with AgentTemplate
  const userAgent = await prisma.userAgent.findFirst({
    where: {
      id: userAgentId,
      userId: user.id,
    },
    include: {
      agentTemplate: true,
    },
  });

  if (!userAgent) {
    return NextResponse.json({ error: "UserAgent not found" }, { status: 404 });
  }

  // Get workspace and organization
  const workspace = await getOrCreateWorkspace(user.id);
  const organizationId = await getCurrentOrgId(user.id);

  // Parse userAgent config
  let userAgentConfig: unknown;
  try {
    userAgentConfig = JSON.parse(userAgent.config);
  } catch {
    userAgentConfig = {};
  }

  // Create RunLog with status "running"
  const runLog = await prisma.runLog.create({
    data: {
      userAgentId: userAgent.id,
      status: "failed",
      executor: "n8n",
      error: "Agent execution is disabled because n8n is no longer configured.",
    },
  });

  // n8n integration has been removed. Return a clear error that execution is disabled.
  return NextResponse.json(
    {
      error: "Agent execution is disabled because the n8n integration has been removed.",
      runId: runLog.id,
      input,
    },
    { status: 503 }
  );
}

