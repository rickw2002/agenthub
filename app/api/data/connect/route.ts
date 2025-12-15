import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

/**
 * API route for connecting a data provider
 * POST /api/data/connect
 * Body: { provider: string }
 * Creates or updates Connection with status="CONNECTED"
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

    if (!VALID_PROVIDERS.includes(provider as any)) {
      return NextResponse.json(
        { error: `Ongeldige provider. Geldige providers: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert connection with CONNECTED status
    const connection = await prisma.connection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider,
        },
      },
      update: {
        status: "CONNECTED",
        authJson: JSON.stringify({ connected: true, connectedAt: new Date().toISOString() }),
      },
      create: {
        userId: user.id,
        provider,
        status: "CONNECTED",
        authJson: JSON.stringify({ connected: true, connectedAt: new Date().toISOString() }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        connection: {
          id: connection.id,
          provider: connection.provider,
          status: connection.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het verbinden van het kanaal" },
      { status: 500 }
    );
  }
}






