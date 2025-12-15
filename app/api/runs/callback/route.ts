import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API route voor callback van workflow engine (n8n)
 * POST /api/runs/callback
 * 
 * This endpoint is called by external services to update run status
 */
export async function POST(request: NextRequest) {
  try {
    // Check service key header
    const serviceKey = request.headers.get("X-AGENT-SERVICE-KEY");
    const expectedKey = process.env.AGENT_SERVICE_KEY;

    if (!expectedKey) {
      console.error("AGENT_SERVICE_KEY not configured in environment");
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 500 }
      );
    }

    if (!serviceKey || serviceKey !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid service key" },
        { status: 401 }
      );
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

    const { runId, status, resultUrl, summary, error, metadata } = body;

    // Validate required fields
    if (!runId || typeof runId !== "string") {
      return NextResponse.json(
        { error: "runId is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    if (!status || !["success", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "status is verplicht en moet 'success' of 'failed' zijn" },
        { status: 400 }
      );
    }

    // Check if RunLog exists
    const existingRunLog = await prisma.runLog.findUnique({
      where: { id: runId },
    });

    if (!existingRunLog) {
      return NextResponse.json(
        { error: "Run niet gevonden" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
    };

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (resultUrl !== undefined) {
      updateData.resultUrl = resultUrl;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    if (metadata !== undefined) {
      // Store metadata as JSON string
      updateData.metadata = JSON.stringify(metadata);
    }

    // Update RunLog
    await prisma.runLog.update({
      where: { id: runId },
      data: updateData,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Run callback error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het updaten van de run" },
      { status: 500 }
    );
  }
}






