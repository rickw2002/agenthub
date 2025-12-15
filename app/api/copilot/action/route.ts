import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { executeCopilotTool } from "@/lib/copilotTools";

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { toolName, payload, workspaceId } = body ?? {};

    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json(
        { error: "toolName is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    const result = await executeCopilotTool({
      toolName,
      context: {
        userId: user.id,
        workspaceId,
      },
      payload: payload ?? {},
    });

    return NextResponse.json(
      {
        toolName,
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[COPILOT][ACTION] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


