import { NextRequest, NextResponse } from "next/server";

import { runAgentRuntime } from "@/lib/agentRuntimeClient";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

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

  const { agentId, message } = (body || {}) as {
    agentId?: unknown;
    message?: unknown;
  };

  const isValidString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

  if (!isValidString(agentId) || !isValidString(message)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const workspace = await getOrCreateWorkspace(user.id);

    const result = await runAgentRuntime({
      workspaceId: workspace.id,
      userId: user.id,
      agentId,
      message,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Agent runtime error:", error);
    return NextResponse.json({ error: "Agent runtime error" }, { status: 500 });
  }
}


