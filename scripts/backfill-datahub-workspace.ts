import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

async function backfillDataHubWorkspaceIds() {
  console.log("🚀 Starting Data Hub workspaceId backfill...");

  const users = await prisma.user.findMany({
    select: { id: true },
  });

  console.log(`📊 Found ${users.length} users to process`);

  for (const user of users) {
    const { id: userId } = user;

    // Ensure workspace exists for this user
    const workspace = await getOrCreateWorkspace(userId);
    const workspaceId = workspace.id;

    console.log(`\n➡️  User ${userId} → workspace ${workspaceId}`);

    // Connections
    const connectionResult = await prisma.$executeRaw<unknown>`
      UPDATE "Connection"
      SET "workspaceId" = ${workspaceId}
      WHERE "userId" = ${userId} AND "workspaceId" IS NULL
    `;
    if (typeof connectionResult === "number" && connectionResult > 0) {
      console.log(`  - Updated ${connectionResult} Connection rows`);
    }

    // MetricDaily
    const metricResult = await prisma.$executeRaw<unknown>`
      UPDATE "MetricDaily"
      SET "workspaceId" = ${workspaceId}
      WHERE "userId" = ${userId} AND "workspaceId" IS NULL
    `;
    if (typeof metricResult === "number" && metricResult > 0) {
      console.log(`  - Updated ${metricResult} MetricDaily rows`);
    }

    // Insights
    const insightResult = await prisma.$executeRaw<unknown>`
      UPDATE "Insight"
      SET "workspaceId" = ${workspaceId}
      WHERE "userId" = ${userId} AND "workspaceId" IS NULL
    `;
    if (typeof insightResult === "number" && insightResult > 0) {
      console.log(`  - Updated ${insightResult} Insight rows`);
    }

    // ChatMessages
    const chatResult = await prisma.$executeRaw<unknown>`
      UPDATE "ChatMessage"
      SET "workspaceId" = ${workspaceId}
      WHERE "userId" = ${userId} AND "workspaceId" IS NULL
    `;
    if (typeof chatResult === "number" && chatResult > 0) {
      console.log(`  - Updated ${chatResult} ChatMessage rows`);
    }
  }

  console.log("\n✅ Data Hub workspaceId backfill completed.");
}

backfillDataHubWorkspaceIds()
  .catch((err) => {
    console.error("❌ Backfill error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });