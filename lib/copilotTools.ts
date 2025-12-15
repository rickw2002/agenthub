import { prisma } from "@/lib/prisma";
import { buildDocumentRagPrompt, RagOutputMode } from "@/lib/documentRagPrompt";

type ToolContext = {
  userId: string;
  workspaceId: string;
};

type ToolPayload = any;

type ToolResult = any;

type ToolHandler = (options: {
  context: ToolContext;
  payload: ToolPayload;
}) => Promise<ToolResult>;

async function validateWorkspaceOwnership(context: ToolContext) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: context.workspaceId,
      ownerId: context.userId,
    },
  });

  if (!workspace) {
    throw new Error("Ongeldige workspaceId voor deze gebruiker");
  }

  return workspace;
}

async function logCopilotAction(options: {
  context: ToolContext;
  toolName: string;
  payload: ToolPayload;
  result: ToolResult | null;
  status: "success" | "error";
  errorMessage?: string;
}) {
  const { context, toolName, payload, result, status, errorMessage } = options;

  await prisma.copilotActionLog.create({
    data: {
      userId: context.userId,
      workspaceId: context.workspaceId,
      toolName,
      payloadJson: JSON.stringify(payload ?? {}),
      resultJson: result !== null ? JSON.stringify(result) : null,
      status,
      errorMessage: errorMessage ?? null,
    },
  });
}

export const copilotTools: Record<string, ToolHandler> = {
  async get_context({ context }) {
    await validateWorkspaceOwnership(context);

    const workspaceContext = await prisma.workspaceContext.findUnique({
      where: {
        workspaceId: context.workspaceId,
      },
    });

    if (!workspaceContext) {
      throw new Error("Workspace context niet gevonden");
    }

    return {
      workspaceId: context.workspaceId,
      profileJson: workspaceContext.profileJson,
      goalsJson: workspaceContext.goalsJson,
      preferencesJson: workspaceContext.preferencesJson,
      createdAt: workspaceContext.createdAt,
      updatedAt: workspaceContext.updatedAt,
    };
  },

  async update_context({ context, payload }) {
    await validateWorkspaceOwnership(context);

    const { profileJson, goalsJson, preferencesJson } = payload ?? {};

    const updateData: {
      profileJson?: string;
      goalsJson?: string;
      preferencesJson?: string;
    } = {};

    if (profileJson !== undefined) {
      updateData.profileJson =
        typeof profileJson === "string"
          ? profileJson
          : JSON.stringify(profileJson);
    }

    if (goalsJson !== undefined) {
      updateData.goalsJson =
        typeof goalsJson === "string" ? goalsJson : JSON.stringify(goalsJson);
    }

    if (preferencesJson !== undefined) {
      updateData.preferencesJson =
        typeof preferencesJson === "string"
          ? preferencesJson
          : JSON.stringify(preferencesJson);
    }

    const workspaceContext = await prisma.workspaceContext.update({
      where: {
        workspaceId: context.workspaceId,
      },
      data: updateData,
    });

    return {
      workspaceId: context.workspaceId,
      profileJson: workspaceContext.profileJson,
      goalsJson: workspaceContext.goalsJson,
      preferencesJson: workspaceContext.preferencesJson,
      createdAt: workspaceContext.createdAt,
      updatedAt: workspaceContext.updatedAt,
    };
  },

  async list_agent_templates({ context }) {
    await validateWorkspaceOwnership(context);

    const templates = await prisma.agentTemplate.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return templates;
  },

  async activate_agent({ context, payload }) {
    await validateWorkspaceOwnership(context);

    const { agentTemplateId, name, config } = payload ?? {};

    if (!agentTemplateId || !name) {
      throw new Error("agentTemplateId en name zijn verplicht");
    }

    const agentTemplate = await prisma.agentTemplate.findUnique({
      where: { id: agentTemplateId },
    });

    if (!agentTemplate) {
      throw new Error("Agent template niet gevonden");
    }

    const userAgent = await prisma.userAgent.create({
      data: {
        userId: context.userId,
        agentTemplateId,
        name,
        config: config ? JSON.stringify(config) : "{}",
        status: "active",
      },
    });

    return {
      userAgentId: userAgent.id,
      status: "active",
    };
  },

  async run_agent({ context, payload }) {
    await validateWorkspaceOwnership(context);

    const { userAgentId } = payload ?? {};

    if (!userAgentId || typeof userAgentId !== "string") {
      throw new Error("userAgentId is verplicht en moet een string zijn");
    }

    const userAgent = await prisma.userAgent.findFirst({
      where: {
        id: userAgentId,
        userId: context.userId,
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
      throw new Error("Agent niet gevonden");
    }

    const runLog = await prisma.runLog.create({
      data: {
        userAgentId: userAgent.id,
        status: "running",
        summary: `Run gestart voor ${userAgent.agentTemplate.name} (Copilot)`,
        metadata: JSON.stringify({
          source: "copilot",
        }),
      },
    });

    const webhookUrl = process.env.N8N_RUN_WEBHOOK_URL;
    if (webhookUrl) {
      // Fire-and-forget webhook call
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
          console.error(
            "[COPILOT][run_agent] Failed to update RunLog after webhook error:",
            updateError
          );
        }
      });
    }

    return {
      runId: runLog.id,
      status: "running",
    };
  },

  async list_active_agents({ context }) {
    await validateWorkspaceOwnership(context);

    const userAgents = await prisma.userAgent.findMany({
      where: {
        userId: context.userId,
        status: "active",
      },
      include: {
        agentTemplate: {
          select: {
            name: true,
            slug: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return userAgents;
  },

  async upload_document({ context, payload }) {
    const workspace = await validateWorkspaceOwnership(context);

    const { title, fileUrl, fileName } = payload ?? {};

    if (!fileUrl || typeof fileUrl !== "string") {
      throw new Error("fileUrl is verplicht en moet een string zijn");
    }

    const safeTitle: string =
      typeof title === "string" && title.trim().length > 0
        ? title.trim()
        : typeof fileName === "string" && fileName.trim().length > 0
        ? fileName.trim()
        : "Onbenoemd document";

    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        title: safeTitle,
        fileUrl,
        status: "pending",
      },
    });

    return {
      documentId: document.id,
      workspaceId: document.workspaceId,
      status: document.status,
    };
  },

  async process_document({ context, payload }) {
    const workspace = await validateWorkspaceOwnership(context);

    const { documentId, text } = payload ?? {};

    if (!documentId || typeof documentId !== "string") {
      throw new Error("documentId is verplicht en moet een string zijn");
    }

    if (!text || typeof text !== "string") {
      throw new Error("text is verplicht en moet een string zijn");
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId: workspace.id,
      },
    });

    if (!document) {
      throw new Error("Document niet gevonden voor deze workspace");
    }

    const DEFAULT_CHUNK_SIZE = 1000;
    const chunks: string[] = [];
    let index = 0;
    while (index < text.length) {
      chunks.push(text.slice(index, index + DEFAULT_CHUNK_SIZE));
      index += DEFAULT_CHUNK_SIZE;
    }

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: {
          documentId: document.id,
          workspaceId: workspace.id,
        },
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embeddingPlaceholder = null as string | null;

        await tx.documentChunk.create({
          data: {
            documentId: document.id,
            workspaceId: workspace.id,
            chunkIndex: i,
            text: chunkText,
            embedding: embeddingPlaceholder,
          },
        });
      }

      await tx.document.update({
        where: {
          id: document.id,
        },
        data: {
          status: "ready",
        },
      });
    });

    return {
      documentId: document.id,
      workspaceId: workspace.id,
      chunks: chunks.length,
      status: "ready",
    };
  },

  async ask_document({ context, payload }) {
    const workspace = await validateWorkspaceOwnership(context);

    const { question, documentId, mode } = payload ?? {};

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      throw new Error("question is verplicht en mag niet leeg zijn");
    }

    const outputMode: RagOutputMode =
      mode && ["summary", "plan", "checklist", "qa"].includes(mode)
        ? mode
        : "qa";

    let targetDocument: { id: string; title: string } | null = null;

    if (documentId) {
      if (typeof documentId !== "string") {
        throw new Error("documentId moet een string zijn");
      }

      const doc = await prisma.document.findFirst({
        where: {
          id: documentId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!doc) {
        throw new Error("Document niet gevonden voor deze workspace");
      }

      targetDocument = doc;
    }

    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5);

    let chunks = await prisma.documentChunk.findMany({
      where: {
        workspaceId: workspace.id,
        ...(targetDocument
          ? { documentId: targetDocument.id }
          : {}),
        ...(keywords.length > 0
          ? {
              OR: keywords.map((word) => ({
                text: { contains: word, mode: "insensitive" as const },
              })),
            }
          : {}),
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
    });

    if (chunks.length === 0) {
      chunks = await prisma.documentChunk.findMany({
        where: {
          workspaceId: workspace.id,
          ...(targetDocument
            ? { documentId: targetDocument.id }
            : {}),
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });
    }

    const workspaceContext = await prisma.workspaceContext.findUnique({
      where: {
        workspaceId: workspace.id,
      },
      select: {
        profileJson: true,
        goalsJson: true,
        preferencesJson: true,
      },
    });

    const prompt = buildDocumentRagPrompt({
      question: question.trim(),
      mode: outputMode,
      workspaceContext: workspaceContext ?? null,
      chunks: chunks.map((c) => ({
        documentId: c.document.id,
        documentTitle: c.document.title,
        chunkIndex: c.chunkIndex,
        text: c.text,
      })),
    });

    return {
      question: question.trim(),
      mode: outputMode,
      workspaceId: workspace.id,
      documentId: targetDocument?.id ?? null,
      retrievedChunks: chunks.map((c) => ({
        id: c.id,
        documentId: c.document.id,
        documentTitle: c.document.title,
        chunkIndex: c.chunkIndex,
      })),
      prompt,
    };
  },
};

export async function executeCopilotTool(options: {
  toolName: string;
  context: ToolContext;
  payload: ToolPayload;
}) {
  const { toolName, context, payload } = options;
  const tool = copilotTools[toolName];

  if (!tool) {
    throw new Error(`Onbekende Copilot tool: ${toolName}`);
  }

  try {
    const result = await tool({ context, payload });

    await logCopilotAction({
      context,
      toolName,
      payload,
      result,
      status: "success",
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await logCopilotAction({
      context,
      toolName,
      payload,
      result: null,
      status: "error",
      errorMessage: message,
    });

    throw error;
  }
}


