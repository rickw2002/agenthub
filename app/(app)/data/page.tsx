import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DataHubContent from "@/components/DataHubContent";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

// UI providers only - GOOGLE_ADS removed from UI (backend still supports it)
const PROVIDERS = ["GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

function mapMetricsToKpis(provider: string, raw: any) {
  // Default mapping for ads-like providers
  if (provider !== "GOOGLE_ANALYTICS") {
    return {
      impressions: raw.impressions || 0,
      clicks: raw.clicks || 0,
      conversions: raw.conversions || 0,
      spend: raw.spend || 0,
    };
  }

  // GA4 uses different metric names – map naar onze generieke KPIs
  return {
    impressions: raw.screenPageViews || 0,
    // Voor nu: sessions ~ clicks (engagement), users wordt elders gebruikt
    clicks: raw.sessions || raw.totalUsers || 0,
    conversions: raw.conversions || 0,
    spend: raw.totalRevenue || 0,
  };
}

export default async function DataHubPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const workspace = await getOrCreateWorkspace(session.user.id);

  // Fetch overview data directly from Prisma (similar to dashboard pattern)
  const connections = await prisma.connection.findMany({
    where: { workspaceId: workspace.id },
  });

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const allMetrics = await prisma.metricDaily.findMany({
    where: {
      workspaceId: workspace.id,
      date: {
        gte: sevenDaysAgo,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const allInsights = await prisma.insight.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Build summaries (same logic as API route)
  const summaries = PROVIDERS.map((provider) => {
    const connection = connectionMap.get(provider);
    const status = connection?.status || "NOT_CONNECTED";

    const providerMetrics = allMetrics.filter((m) => m.provider === provider);
    const providerInsights = allInsights
      .filter((i) => i.provider === provider)
      .slice(0, 3);

    let kpis = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    };

    if (providerMetrics.length > 0) {
      const latestMetrics = providerMetrics[providerMetrics.length - 1];
      try {
        const metricsData = JSON.parse(latestMetrics.metricsJson);
        kpis = mapMetricsToKpis(provider, metricsData);
      } catch (e) {
        // Ignore parsing errors
      }
    }

    const series7d = providerMetrics.map((metric) => {
      try {
        const metricsData = JSON.parse(metric.metricsJson);
        return {
          date: metric.date.toISOString().split("T")[0],
          metrics: mapMetricsToKpis(metric.provider, metricsData),
        };
      } catch (e) {
        return {
          date: metric.date.toISOString().split("T")[0],
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
          },
        };
      }
    });

    const latestInsights = providerInsights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      severity: insight.severity,
      createdAt: insight.createdAt.toISOString(),
    }));

    return {
      provider,
      status,
      kpis,
      series7d,
      latestInsights,
    };
  });

  return <DataHubContent overviewData={{ summaries }} />;
}

