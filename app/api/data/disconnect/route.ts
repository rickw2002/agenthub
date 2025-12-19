import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

/**
 * API route for disconnecting a data provider
 * POST /api/data/disconnect
 * Body: { provider: string }
 * Sets Connection status to "NOT_CONNECTED" (or deletes row)
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { provider } = body;

    // Validate provider
    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { error: "provider is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    if (!VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
      return NextResponse.json(
        { error: `Ongeldige provider. Geldige providers: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Update connection to NOT_CONNECTED (or create if it doesn't exist)
    // For now, we'll upsert to NOT_CONNECTED to ensure the record exists
    await prisma.connection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider,
        },
      },
      update: {
        status: "NOT_CONNECTED",
        authJson: null,
        userId: user.id,
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        provider,
        status: "NOT_CONNECTED",
        authJson: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kanaal succesvol losgekoppeld",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het loskoppelen van het kanaal" },
      { status: 500 }
    );
  }
}

