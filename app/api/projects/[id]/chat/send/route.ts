import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { runAgentRuntime } from "@/lib/agentRuntimeClient";

type RouteParams = {
  params: {
    id: string;
  };
};

// Rate limiting: in-memory Map per instance
// Format: userId -> { count: number, resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Concurrency guard: track in-flight requests per user
const inFlightRequests = new Set<string>();

// Constants
const MAX_MESSAGE_LENGTH = 100000; // Safety cap for message length
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest, { params }: RouteParams) {
  const projectId = params.id;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json(
      { error: "Project id is verplicht" },
      { status: 400 }
    );
  }

  let user: { id: string } | null = null;

  try {
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    user = await getCurrentUser();
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

    const { message, chatId } = body ?? {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    // Message length safety cap
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `Bericht is te lang. Maximum lengte is ${MAX_MESSAGE_LENGTH} karakters.`,
        },
        { status: 400 }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const userRateLimit = rateLimitMap.get(user.id);
    if (userRateLimit) {
      if (now < userRateLimit.resetAt) {
        // Still in rate limit window
        if (userRateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
          return NextResponse.json(
            {
              error: "Te veel verzoeken. Probeer het over een paar minuten opnieuw.",
            },
            { status: 429 }
          );
        }
        userRateLimit.count += 1;
      } else {
        // Window expired, reset
        rateLimitMap.set(user.id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      // First request for this user
      rateLimitMap.set(user.id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    // Concurrency guard (best-effort)
    if (inFlightRequests.has(user.id)) {
      return NextResponse.json(
        {
          error: "Er wordt al een verzoek verwerkt. Wacht even en probeer het opnieuw.",
        },
        { status: 429 }
      );
    }

    inFlightRequests.add(user.id);

    const orgId = await getCurrentOrgId(user.id);

    // Validate project belongs to current org
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      include: {
        settings: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project niet gevonden voor deze organisatie" },
        { status: 404 }
      );
    }

    // Get useGlobalLibrary from project settings (default true)
    const useGlobalLibrary = project.settings?.useGlobalLibrary ?? true;

    // Get or create chat
    let chat;
    if (chatId) {
      // Validate chat belongs to this project
      chat = await prisma.projectChat.findFirst({
        where: {
          id: chatId,
          projectId: projectId,
        },
      });

      if (!chat) {
        return NextResponse.json(
          { error: "Chat niet gevonden voor dit project" },
          { status: 404 }
        );
      }
    } else {
      // Create new chat
      chat = await prisma.projectChat.create({
        data: {
          projectId: projectId,
          title: null, // Optional title, can be set later
        },
      });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    // Store USER message
    const userMessage = await prisma.projectChatMessage.create({
      data: {
        projectChatId: chat.id,
        role: "USER",
        content: message.trim(),
      },
    });

    // Call agent runtime
    let runtimeOutput;
    try {
      runtimeOutput = await runAgentRuntime({
        workspaceId: workspace.id,
        userId: user.id,
        agentId: "doc-qa-v1",
        message: message.trim(),
        organizationId: orgId,
        projectId: projectId,
        useGlobalLibrary: useGlobalLibrary,
      });
    } catch (runtimeError) {
      // Store error message
      const errorMessage = runtimeError instanceof Error ? runtimeError.message : "Unknown error";
      await prisma.projectChatMessage.create({
        data: {
          projectChatId: chat.id,
          role: "ASSISTANT",
          content: "Er is een fout opgetreden bij het genereren van het antwoord.",
          metaJson: JSON.stringify({ error: errorMessage }),
        },
      });

      return NextResponse.json(
        {
          error: "Agent runtime error",
          chatId: chat.id,
          messageId: userMessage.id,
        },
        { status: 500 }
      );
    }

    // Build sourcesJson from answer_from_sources
    const sourcesJson = JSON.stringify(runtimeOutput.answer_from_sources || []);

    // Build metaJson from additional_reasoning and other metadata
    const metaJson = JSON.stringify({
      additional_reasoning: runtimeOutput.additional_reasoning || [],
      missing_info_questions: runtimeOutput.missing_info_questions || [],
    });

    // Store ASSISTANT message with sources and metadata
    const assistantMessage = await prisma.projectChatMessage.create({
      data: {
        projectChatId: chat.id,
        role: "ASSISTANT",
        content: runtimeOutput.reply || "Ik kan op dit moment geen antwoord genereren.",
        sourcesJson: sourcesJson,
        metaJson: metaJson,
      },
    });

    return NextResponse.json(
      {
        chatId: chat.id,
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          sourcesJson: assistantMessage.sourcesJson,
          metaJson: assistantMessage.metaJson,
          createdAt: assistantMessage.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PROJECTS][CHAT][SEND] Error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      {
        error: "Er is iets misgegaan bij het verzenden van het bericht",
        details: message,
      },
      { status: 500 }
    );
  } finally {
    // Always remove from concurrency guard
    if (user) {
      inFlightRequests.delete(user.id);
    }
  }
}

