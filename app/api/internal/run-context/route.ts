import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * API route for fetching run context (internal service-to-service)
 * GET /api/internal/run-context?userAgentId=...
 */
export async function GET(request: NextRequest) {
  try {
    // Check service key header
    const serviceKey = request.headers.get("X-AGENT-SERVICE-KEY");
    const expectedKey = process.env.AGENT_SERVICE_KEY;

    if (!expectedKey) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[run-context] AGENT_SERVICE_KEY not configured in environment");
      }
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 500 }
      );
    }

    if (!serviceKey || serviceKey !== expectedKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[run-context] Invalid or missing service key");
      }
      return NextResponse.json(
        { error: "Unauthorized: Invalid service key" },
        { status: 401 }
      );
    }

    // Get userAgentId from query parameters
    const { searchParams } = new URL(request.url);
    const userAgentId = searchParams.get("userAgentId");

    if (!userAgentId || typeof userAgentId !== "string") {
      return NextResponse.json(
        { error: "userAgentId query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch UserAgent with related AgentTemplate
    const userAgent = await prisma.userAgent.findUnique({
      where: { id: userAgentId },
      include: {
        agentTemplate: {
          select: {
            name: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    if (!userAgent) {
      return NextResponse.json(
        { error: "UserAgent not found" },
        { status: 404 }
      );
    }

    // Parse config JSON, or return {} if empty
    let config = {};
    if (userAgent.config && userAgent.config.trim() !== "") {
      try {
        config = JSON.parse(userAgent.config);
      } catch (e) {
        // If parsing fails, return empty object
        config = {};
      }
    }

    // Return the required JSON structure
    return NextResponse.json({
      runId: null,
      userAgentId: userAgent.id,
      agentTemplate: {
        name: userAgent.agentTemplate.name,
        slug: userAgent.agentTemplate.slug,
        type: userAgent.agentTemplate.type,
      },
      config,
    });
  } catch (error) {
    console.error("Run context error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van de run context" },
      { status: 500 }
    );
  }
}






