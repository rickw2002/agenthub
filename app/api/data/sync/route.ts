import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// POST /api/data/sync - Manual sync trigger
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    // Parse body (optional provider filter)
    let body: { provider?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Ignore body parse errors, default to sync all
    }

    // Call Intel service sync endpoint
    const intelBaseUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!intelBaseUrl || !cronSecret) {
      return NextResponse.json(
        { error: "Intel service niet geconfigureerd" },
        { status: 500 }
      );
    }

    const response = await fetch(`${intelBaseUrl}/internal/cron/sync-daily`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cron-Secret": cronSecret,
      },
      body: JSON.stringify({
        provider: body.provider || "GOOGLE_ANALYTICS",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.message || "Sync gefaald",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Sync succesvol",
      result: data,
    });
  } catch (error) {
    console.error("[SYNC][POST] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Er is iets misgegaan bij het triggeren van de sync",
      },
      { status: 500 }
    );
  }
}
