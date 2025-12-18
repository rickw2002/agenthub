import { prisma } from "@/lib/prisma";
import type { Prisma, ProfileCard } from "@prisma/client";
import { BureauAIErrorImpl } from "@/lib/bureauai/tenancy";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";

type NullableProjectId = string | null | undefined;

function normalizeProjectId(projectId?: string | null) {
  return projectId ?? null;
}

function hasProjectId(projectId: string | null): projectId is string {
  return typeof projectId === "string" && projectId.length > 0;
}

export async function upsertProfileAnswer(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
  questionKey: string;
  answerText: string;
  answerJson?: Prisma.JsonValue | null;
}) {
  const { workspaceId, questionKey, answerText, answerJson } = args;
  const projectId = normalizeProjectId(args.projectId);

  if (hasProjectId(projectId)) {
    return prisma.profileAnswer.upsert({
      where: {
        workspaceId_projectId_questionKey: {
          workspaceId,
          projectId,
          questionKey,
        },
      },
      update: {
        answerText,
        answerJson: answerJson ?? undefined,
      },
      create: {
        workspaceId,
        projectId,
        questionKey,
        answerText,
        answerJson: answerJson ?? undefined,
      },
    });
  }

  const existing = await prisma.profileAnswer.findFirst({
    where: { workspaceId, projectId: null, questionKey },
    select: { id: true },
  });

  if (existing) {
    return prisma.profileAnswer.update({
      where: { id: existing.id },
      data: {
        answerText,
        answerJson: answerJson ?? undefined,
      },
    });
  }

  return prisma.profileAnswer.create({
    data: {
      workspaceId,
      projectId: null,
      questionKey,
      answerText,
      answerJson: answerJson ?? undefined,
    },
  });
}

export async function listProfileAnswers(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
}) {
  const { workspaceId, projectId } = args;

  return prisma.profileAnswer.findMany({
    where: {
      workspaceId,
      projectId: projectId ?? null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function listFoundationAnswers(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
}) {
  const { workspaceId, projectId } = args;

  return prisma.profileAnswer.findMany({
    where: {
      workspaceId,
      projectId: projectId ?? null,
      questionKey: {
        in: [...FOUNDATIONS_KEYS],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function upsertProfileState(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
  knownKeys?: Prisma.JsonValue | null;
  missingKeys?: Prisma.JsonValue | null;
  confidenceScore?: number;
  lastQuestionKey?: string | null;
}) {
  const {
    workspaceId,
    projectId: rawProjectId,
    knownKeys,
    missingKeys,
    confidenceScore,
    lastQuestionKey,
  } = args;

  const projectId = normalizeProjectId(rawProjectId);

  if (hasProjectId(projectId)) {
    return prisma.profileState.upsert({
      where: {
        workspaceId_projectId: {
          workspaceId,
          projectId,
        },
      },
      update: {
        knownKeys: knownKeys ?? undefined,
        missingKeys: missingKeys ?? undefined,
        confidenceScore: confidenceScore ?? undefined,
        lastQuestionKey: lastQuestionKey ?? undefined,
      },
      create: {
        workspaceId,
        projectId,
        knownKeys: knownKeys ?? undefined,
        missingKeys: missingKeys ?? undefined,
        confidenceScore: confidenceScore ?? 0,
        lastQuestionKey: lastQuestionKey ?? null,
      },
    });
  }

  const existing = await prisma.profileState.findFirst({
    where: {
      workspaceId,
      projectId: null,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.profileState.update({
      where: { id: existing.id },
      data: {
        knownKeys: knownKeys ?? undefined,
        missingKeys: missingKeys ?? undefined,
        confidenceScore: confidenceScore ?? undefined,
        lastQuestionKey: lastQuestionKey ?? undefined,
      },
    });
  }

  return prisma.profileState.create({
    data: {
      workspaceId,
      projectId: null,
      knownKeys: knownKeys ?? undefined,
      missingKeys: missingKeys ?? undefined,
      confidenceScore: confidenceScore ?? 0,
      lastQuestionKey: lastQuestionKey ?? null,
    },
  });
}

export async function getProfileState(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
}) {
  const { workspaceId } = args;
  const projectId = normalizeProjectId(args.projectId);

  if (hasProjectId(projectId)) {
    return prisma.profileState.findUnique({
      where: {
        workspaceId_projectId: {
          workspaceId,
          projectId,
        },
      },
    });
  }

  return prisma.profileState.findFirst({
    where: {
      workspaceId,
      projectId: null,
    },
  });
}

export async function getLatestProfileCard(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
}) {
  const { workspaceId, projectId } = args;

  return prisma.profileCard.findFirst({
    where: {
      workspaceId,
      projectId: projectId ?? null,
    },
    orderBy: {
      version: "desc",
    },
  });
}

export async function createProfileCardNextVersionTx(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
  voiceCard: Prisma.JsonValue;
  audienceCard: Prisma.JsonValue;
  offerCard: Prisma.JsonValue;
  constraints: Prisma.JsonValue;
}): Promise<ProfileCard> {
  const { workspaceId, projectId, voiceCard, audienceCard, offerCard, constraints } =
    args;

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const last = await tx.profileCard.findFirst({
          where: {
            workspaceId,
            projectId: projectId ?? null,
          },
          orderBy: {
            version: "desc",
          },
          select: {
            version: true,
          },
        });

        const nextVersion = (last?.version ?? 0) + 1;

        const card = await tx.profileCard.create({
          data: {
            workspaceId,
            projectId: projectId ?? null,
            version: nextVersion,
            voiceCard: voiceCard as Prisma.InputJsonValue,
            audienceCard: audienceCard as Prisma.InputJsonValue,
            offerCard: offerCard as Prisma.InputJsonValue,
            constraints: constraints as Prisma.InputJsonValue,
          },
        });

        return card;
      });

      return created;
    } catch (err) {
      lastError = err;
      const code = (err as any)?.code;

      if (code === "P2002" && attempt < 2) {
        // Unique constraint violation on (workspaceId, projectId, version) – retry
        continue;
      }

      break;
    }
  }

  throw new BureauAIErrorImpl({
    code: "INTERNAL_ERROR",
    message:
      "Kon het profiel niet versieerbaar opslaan door een interne fout.",
    action:
      "Probeer het nog eens. Als dit blijft gebeuren, vernieuw de pagina en probeer opnieuw te synthesizen.",
    status: 500,
  });
}

export async function listExamples(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
}) {
  const { workspaceId, projectId } = args;

  return prisma.example.findMany({
    where: {
      workspaceId,
      projectId: projectId ?? null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getOutputById(id: string) {
  return prisma.output.findUnique({
    where: { id },
  });
}

export async function createFeedback(args: {
  outputId: string;
  rating: number;
  notes?: string | null;
}) {
  const { outputId, rating, notes } = args;

  return prisma.feedback.create({
    data: {
      outputId,
      rating,
      notes: notes ?? null,
    },
  });
}

export async function getProfileCardByVersion(args: {
  workspaceId: string;
  projectId?: NullableProjectId;
  version: number;
}) {
  const { workspaceId, projectId, version } = args;

  return prisma.profileCard.findFirst({
    where: {
      workspaceId,
      projectId: projectId ?? null,
      version,
    },
  });
}


