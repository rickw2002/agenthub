import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";
import { callN8nWebhook } from "@/lib/n8nClient";

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

  const agentTemplate = userAgent.agentTemplate;

  // Validate executor
  if (agentTemplate.executor !== "n8n") {
    return NextResponse.json(
      { error: `Agent template executor is "${agentTemplate.executor}", expected "n8n"` },
      { status: 400 }
    );
  }

  // Validate n8nWebhookPath
  if (!agentTemplate.n8nWebhookPath) {
    return NextResponse.json(
      { error: "Agent template n8nWebhookPath is not configured" },
      { status: 400 }
    );
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
      status: "running",
      executor: "n8n",
    },
  });

  // Prepare n8n payload
  const n8nPayload = {
    runId: runLog.id,
    userId: user.id,
    workspaceId: workspace.id,
    organizationId,
    projectId: null, // TODO: Extract from userAgent config if available
    agentTemplateSlug: agentTemplate.slug,
    userAgentConfig,
    input,
  };

  // Call n8n webhook
  const n8nResponse = await callN8nWebhook({
    webhookPath: agentTemplate.n8nWebhookPath,
    payload: n8nPayload,
  });

  // Update RunLog based on response
  if (n8nResponse.success) {
    const responseData = n8nResponse.data as { summary?: string; metadata?: unknown } | undefined;
    await prisma.runLog.update({
      where: { id: runLog.id },
      data: {
        status: "success",
        summary: responseData?.summary || null,
        metadata: responseData?.metadata ? JSON.stringify(responseData.metadata) : null,
        externalRunId: typeof responseData === "object" && responseData !== null && "executionId" in responseData
          ? String(responseData.executionId)
          : null,
      },
    });
  } else {
    await prisma.runLog.update({
      where: { id: runLog.id },
      data: {
        status: "failed",
        error: n8nResponse.error || "Unknown error",
        metadata: n8nResponse.data ? JSON.stringify({ status: n8nResponse.status, body: n8nResponse.data }) : null,
      },
    });
  }

  // Return n8n response
  if (n8nResponse.success) {
    return NextResponse.json(n8nResponse.data, { status: 200 });
  } else {
    return NextResponse.json(
      {
        error: n8nResponse.error,
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
      },
      { status: n8nResponse.status || 500 }
    );
  }
}

