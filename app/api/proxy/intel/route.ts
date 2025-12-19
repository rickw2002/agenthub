import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Proxy route for FastAPI Intel service calls.
 * Adds X-Intel-API-Key header server-side.
 * GET /api/proxy/intel?path=/providers/ga4/properties&workspaceId=...&userId=...
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");

    if (!path) {
      return NextResponse.json({ error: "path parameter is required" }, { status: 400 });
    }

    const intelBaseUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
    const intelApiKey = process.env.INTEL_API_KEY;

    if (!intelBaseUrl) {
      return NextResponse.json({ error: "Intel service not configured" }, { status: 500 });
    }

    if (!intelApiKey) {
      return NextResponse.json({ error: "Intel API key not configured" }, { status: 500 });
    }

    // Build query string (exclude path)
    const queryParams = new URLSearchParams();
    if (workspaceId) queryParams.set("workspaceId", workspaceId);
    if (userId) queryParams.set("userId", userId);
    const queryString = queryParams.toString();

    const url = `${intelBaseUrl}${path}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "X-Intel-API-Key": intelApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "Intel service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Intel proxy error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proxy/intel
 * Body: { path: string, body: any }
 */
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

    const { path, body } = await request.json();

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const intelBaseUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
    const intelApiKey = process.env.INTEL_API_KEY;

    if (!intelBaseUrl) {
      return NextResponse.json({ error: "Intel service not configured" }, { status: 500 });
    }

    if (!intelApiKey) {
      return NextResponse.json({ error: "Intel API key not configured" }, { status: 500 });
    }

    const url = `${intelBaseUrl}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Intel-API-Key": intelApiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "Intel service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Intel proxy error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het versturen van data" },
      { status: 500 }
    );
  }
}

