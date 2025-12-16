import { NextRequest, NextResponse } from "next/server";

import { runAgentRuntime } from "@/lib/agentRuntimeClient";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCurrentOrgId } from "@/lib/organization";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Require authentication first
  const authErrorResponse = await requireAuth();
  if (authErrorResponse) {
    return authErrorResponse;
  }

  const user = await getCurrentUser();

  // Safety check: requireAuth already guarantees a user, but guard just in case
  if (!user || !user.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { agentId, message, runId } = (body || {}) as {
    agentId?: unknown;
    message?: unknown;
    runId?: unknown;
  };

  const isValidString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

  if (!isValidString(agentId) || !isValidString(message)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // runId is optional, but if provided must be a non-empty string
  const isValidRunId = runId === undefined || (typeof runId === "string" && runId.trim().length > 0);
  if (!isValidRunId) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const workspace = await getOrCreateWorkspace(user.id);
    const orgId = await getCurrentOrgId(user.id);

    const payload: {
      workspaceId: string;
      userId: string;
      agentId: string;
      message: string;
      runId?: string;
      organizationId: string;
      projectId?: string | null;
      useGlobalLibrary?: boolean;
    } = {
      workspaceId: workspace.id,
      userId: user.id,
      agentId,
      message,
      organizationId: orgId,
    };

    // Only include runId if provided
    if (runId !== undefined && typeof runId === "string" && runId.trim().length > 0) {
      payload.runId = runId.trim();
    }

    const result = await runAgentRuntime(payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Agent runtime error:", error);

    // Only expose detailed error info when AGENT_RUNTIME_DEBUG is enabled
    if (process.env.AGENT_RUNTIME_DEBUG === "1") {
      // Try to parse JSON error details from error message (from agentRuntimeClient)
      let errorDetails: string | object;
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          errorDetails = typeof parsed === "object" && parsed !== null ? parsed : error.message;
        } catch {
          errorDetails = error.message;
        }
      } else {
        errorDetails = String(error);
      }

      return NextResponse.json(
        {
          error: "Agent runtime error",
          details: errorDetails,
        },
        { status: 500 },
      );
    }

    // Generic error for production
    return NextResponse.json({ error: "Agent runtime error" }, { status: 500 });
  }
}


