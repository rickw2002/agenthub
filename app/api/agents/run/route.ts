import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * API route voor het starten van een agent run
 * POST /api/agents/run
 */
export async function POST(request: NextRequest) {
  let runLogId: string | null = null;

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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { userAgentId } = body;

    // Validate userAgentId is provided
    if (!userAgentId || typeof userAgentId !== "string") {
      return NextResponse.json(
        { error: "userAgentId is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    // Check if UserAgent exists and belongs to the logged-in user (no existence leak)
    const userAgent = await prisma.userAgent.findFirst({
      where: {
        id: userAgentId,
        userId: user.id,
      },
      include: {
        agentTemplate: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!userAgent) {
      return NextResponse.json(
        { error: "Agent niet gevonden" },
        { status: 404 }
      );
    }

    // Create RunLog with status "running"
    const runLog = await prisma.runLog.create({
      data: {
        userAgentId: userAgent.id,
        status: "running",
        summary: `Run gestart voor ${userAgent.agentTemplate.name}`,
      },
    });
    runLogId = runLog.id;

    // Fire-and-forget webhook call to n8n
    const webhookUrl = process.env.N8N_RUN_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runLog.id,
          userAgentId: userAgent.id,
        }),
      }).catch(async (error) => {
        // If webhook call fails, update RunLog status to "failed"
        const errorMessage = error instanceof Error ? error.message : String(error);
        try {
          await prisma.runLog.update({
            where: { id: runLog.id },
            data: {
              status: "failed",
              error: `Webhook call failed: ${errorMessage}`,
            },
          });
        } catch (updateError) {
          console.error("Failed to update RunLog after webhook error:", updateError);
        }
      });
    }

    return NextResponse.json(
      {
        runId: runLog.id,
        status: "running",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent run error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (runLogId) {
      try {
        await prisma.runLog.update({
          where: { id: runLogId },
          data: {
            status: "failed",
            error: errorMessage,
          },
        });
      } catch (updateError) {
        console.error("Failed to update RunLog after error:", updateError);
      }
    }

    return NextResponse.json(
      { error: "Er is iets misgegaan bij het starten van de run" },
      { status: 500 }
    );
  }
}

