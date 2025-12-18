import type { PrismaClient, Prisma } from "@prisma/client";

type JsonValue = Prisma.JsonValue;

function isPlainObject(value: unknown): value is Record<string, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function deepMerge(base: JsonValue, override: JsonValue): JsonValue {
  // Arrays are not merged element-wise; the override array fully replaces the base array.
  if (override === undefined || override === null) {
    return base;
  }

  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, any> = { ...base };

    for (const key of Object.keys(override)) {
      const overrideValue = (override as any)[key];
      const baseValue = (base as any)[key];

      if (overrideValue === undefined) {
        continue;
      }

      if (baseValue === undefined) {
        result[key] = overrideValue;
      } else {
        result[key] = deepMerge(baseValue, overrideValue);
      }
    }

    return result;
  }

  return override;
}

export async function getEffectiveProfile(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string | null
) {
  const projectScope = projectId ?? null;

  const [
    workspaceCard,
    projectCard,
    workspaceAnswers,
    projectAnswers,
    workspaceExamples,
    projectExamples,
  ] = await Promise.all([
    prisma.profileCard.findFirst({
      where: {
        workspaceId,
        projectId: null,
      },
      orderBy: {
        version: "desc",
      },
    }),
    projectScope
      ? prisma.profileCard.findFirst({
          where: {
            workspaceId,
            projectId: projectScope,
          },
          orderBy: {
            version: "desc",
          },
        })
      : Promise.resolve(null),
    prisma.profileAnswer.findMany({
      where: {
        workspaceId,
        projectId: null,
      },
    }),
    projectScope
      ? prisma.profileAnswer.findMany({
          where: {
            workspaceId,
            projectId: projectScope,
          },
        })
      : Promise.resolve([]),
    prisma.example.findMany({
      where: {
        workspaceId,
        projectId: null,
      },
    }),
    projectScope
      ? prisma.example.findMany({
          where: {
            workspaceId,
            projectId: projectScope,
          },
        })
      : Promise.resolve([]),
  ]);

  const mergedVoiceCard = deepMerge(
    (workspaceCard?.voiceCard as JsonValue) ?? {},
    (projectCard?.voiceCard as JsonValue) ?? {}
  );
  const mergedAudienceCard = deepMerge(
    (workspaceCard?.audienceCard as JsonValue) ?? {},
    (projectCard?.audienceCard as JsonValue) ?? {}
  );
  const mergedOfferCard = deepMerge(
    (workspaceCard?.offerCard as JsonValue) ?? {},
    (projectCard?.offerCard as JsonValue) ?? {}
  );
  const mergedConstraints = deepMerge(
    (workspaceCard?.constraints as JsonValue) ?? {},
    (projectCard?.constraints as JsonValue) ?? {}
  );

  const answersByKey: Record<
    string,
    { answerText: string; answerJson: JsonValue | null }
  > = {};

  for (const answer of workspaceAnswers) {
    answersByKey[answer.questionKey] = {
      answerText: answer.answerText,
      answerJson: (answer.answerJson as JsonValue) ?? null,
    };
  }

  for (const answer of projectAnswers) {
    answersByKey[answer.questionKey] = {
      answerText: answer.answerText,
      answerJson: (answer.answerJson as JsonValue) ?? null,
    };
  }

  const examples = [...projectExamples, ...workspaceExamples];

  return {
    workspaceCardVersion: workspaceCard?.version ?? null,
    projectCardVersion: projectCard?.version ?? null,
    voiceCard: mergedVoiceCard,
    audienceCard: mergedAudienceCard,
    offerCard: mergedOfferCard,
    constraints: mergedConstraints,
    answersByKey,
    examples,
  };
}


