import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🔎 Checking Data Hub tables for NULL workspaceId values...\n");

  // Use raw SQL so this works regardless of Prisma nullability for workspaceId
  // Execute queries separately for type safety
  const connectionResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "Connection" WHERE "workspaceId" IS NULL
  `;
  const metricResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "MetricDaily" WHERE "workspaceId" IS NULL
  `;
  const insightResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "Insight" WHERE "workspaceId" IS NULL
  `;
  const chatResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "ChatMessage" WHERE "workspaceId" IS NULL
  `;

  // Extract counts with explicit type handling
  const connCount: number = connectionResult[0] ? Number(connectionResult[0].count) : 0;
  const metricCount: number = metricResult[0] ? Number(metricResult[0].count) : 0;
  const insightCount: number = insightResult[0] ? Number(insightResult[0].count) : 0;
  const chatCount: number = chatResult[0] ? Number(chatResult[0].count) : 0;

  console.log(`Connection  workspaceId NULL count: ${connCount}`);
  console.log(`MetricDaily workspaceId NULL count: ${metricCount}`);
  console.log(`Insight     workspaceId NULL count: ${insightCount}`);
  console.log(`ChatMessage workspaceId NULL count: ${chatCount}`);

  const total = connCount + metricCount + insightCount + chatCount;

  if (total > 0) {
    console.error(
      "\n❌ Data Hub workspaceId is not fully backfilled. Run datahub:backfill-workspace and re-check."
    );
    process.exit(1);
  }

  console.log("\n✅ All Data Hub workspaceId values are backfilled (no NULLs).");
}

main()
  .catch((err) => {
    console.error("❌ Error while checking Data Hub workspaceId:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
