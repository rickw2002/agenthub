import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/**
 * API route for getting current user's workspace info
 * GET /api/workspace/me
 * Returns { userId, workspaceId }
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    return NextResponse.json(
      {
        userId: user.id,
        workspaceId: workspace.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Workspace me error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van workspace info" },
      { status: 500 }
    );
  }
}

