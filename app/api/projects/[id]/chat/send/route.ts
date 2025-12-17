import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { getCurrentOrgId } from "@/lib/organization";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { callN8nWebhook } from "@/lib/n8nClient";

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

    // Check if n8n workflow is configured for project chat
    // TODO: Add project-specific webhook path to ProjectSettings if needed
    const projectChatWebhookPath = process.env.N8N_PROJECT_CHAT_WEBHOOK_PATH || "/webhook/bureau-ai/project-chat";
    
    if (!process.env.N8N_BASE_URL) {
      return NextResponse.json(
        { error: "Project chat workflow is not configured. Please configure N8N_BASE_URL." },
        { status: 400 }
      );
    }

    // Store USER message
    const userMessage = await prisma.projectChatMessage.create({
      data: {
        projectChatId: chat.id,
        role: "USER",
        content: message.trim(),
      },
    });

    // Call n8n webhook for project chat
    const n8nPayload = {
      projectId,
      chatId: chat.id,
      message: message.trim(),
      organizationId: orgId,
      workspaceId: workspace.id,
      useGlobalLibrary,
    };

    const n8nResponse = await callN8nWebhook({
      webhookPath: projectChatWebhookPath,
      payload: n8nPayload,
    });

    // Handle n8n response
    if (!n8nResponse.success) {
      // Store error message
      const errorMessage = n8nResponse.error || "Failed to process chat message";
      await prisma.projectChatMessage.create({
        data: {
          projectChatId: chat.id,
          role: "ASSISTANT",
          content: errorMessage,
          metaJson: JSON.stringify({ error: errorMessage }),
        },
      });

      return NextResponse.json(
        {
          error: errorMessage,
          chatId: chat.id,
        },
        { status: n8nResponse.status || 500 }
      );
    }

    // Parse n8n response
    const responseData = n8nResponse.data as {
      reply?: string;
      answer_from_sources?: unknown;
      additional_reasoning?: unknown;
      missing_info_questions?: unknown;
    };

    // Build sourcesJson from answer_from_sources
    const sourcesJson = responseData.answer_from_sources
      ? JSON.stringify(responseData.answer_from_sources)
      : null;

    // Build metaJson from additional_reasoning and missing_info_questions
    const metaJson = JSON.stringify({
      additional_reasoning: responseData.additional_reasoning || [],
      missing_info_questions: responseData.missing_info_questions || [],
    });

    // Store ASSISTANT message with sources and metadata
    await prisma.projectChatMessage.create({
      data: {
        projectChatId: chat.id,
        role: "ASSISTANT",
        content: responseData.reply || "Ik kan op dit moment geen antwoord genereren.",
        sourcesJson: sourcesJson,
        metaJson: metaJson,
      },
    });

    // Fetch all messages for this chat (ordered by createdAt asc)
    const allMessages = await prisma.projectChatMessage.findMany({
      where: {
        projectChatId: chat.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(
      {
        chatId: chat.id,
        messages: allMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sourcesJson: msg.sourcesJson,
          metaJson: msg.metaJson,
          createdAt: msg.createdAt,
        })),
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

