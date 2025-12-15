import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChannelDetailContent from "@/components/ChannelDetailContent";

const VALID_PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

function slugToProvider(slug: string): string | null {
  // Convert "google_ads" or "google-ads" to "GOOGLE_ADS"
  const upperSlug = slug.toUpperCase().replace(/-/g, "_");
  if (VALID_PROVIDERS.includes(upperSlug as any)) {
    return upperSlug;
  }
  return null;
}

interface PageProps {
  params: {
    provider: string;
  };
}

export default async function ChannelDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Convert slug to provider enum
  const provider = slugToProvider(params.provider);

  if (!provider) {
    notFound();
  }

  // Fetch channel data directly from Prisma (similar to dashboard pattern)
  const connection = await prisma.connection.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider,
      },
    },
  });

  // Get last 30 days of metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const metrics = await prisma.metricDaily.findMany({
    where: {
      userId: session.user.id,
      provider,
      date: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // Compute KPIs from latest day's metrics
  let kpis = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
  };

  if (metrics.length > 0) {
    const latestMetric = metrics[metrics.length - 1];
    try {
      const metricsData = JSON.parse(latestMetric.metricsJson);
      kpis = {
        impressions: metricsData.impressions || 0,
        clicks: metricsData.clicks || 0,
        conversions: metricsData.conversions || 0,
        spend: metricsData.spend || 0,
      };
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Get latest 10 insights
  const insights = await prisma.insight.findMany({
    where: {
      userId: session.user.id,
      provider,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  // Format metrics for response
  const formattedMetrics = metrics.map((metric) => {
    try {
      const metricsData = JSON.parse(metric.metricsJson);
      let dimensionsData = null;
      if (metric.dimensionsJson) {
        try {
          dimensionsData = JSON.parse(metric.dimensionsJson);
        } catch (e) {
          // Ignore dimension parsing errors
        }
      }
      return {
        id: metric.id,
        date: metric.date.toISOString().split("T")[0],
        metrics: {
          impressions: metricsData.impressions || 0,
          clicks: metricsData.clicks || 0,
          conversions: metricsData.conversions || 0,
          spend: metricsData.spend || 0,
        },
        dimensions: dimensionsData,
      };
    } catch (e) {
      return {
        id: metric.id,
        date: metric.date.toISOString().split("T")[0],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
        },
        dimensions: null,
      };
    }
  });

  // Format insights
  const formattedInsights = insights.map((insight) => ({
    id: insight.id,
    title: insight.title,
    summary: insight.summary,
    severity: insight.severity,
    period: insight.period,
    createdAt: insight.createdAt.toISOString(),
  }));

  const channelData = {
    provider,
    connection,
    kpis,
    metrics: formattedMetrics,
    insights: formattedInsights,
  };

  return <ChannelDetailContent channelData={channelData} />;
}

