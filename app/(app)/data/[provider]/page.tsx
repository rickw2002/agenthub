import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import ChannelDetailContent from "@/components/ChannelDetailContent";
import GA4PropertySelector from "@/components/GA4PropertySelector";

const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

function slugToProvider(slug: string): string | null {
  // Convert "google_ads" or "google-ads" to "GOOGLE_ADS"
  const upperSlug = slug.toUpperCase().replace(/-/g, "_");
  if (VALID_PROVIDERS.includes(upperSlug as any)) {
    return upperSlug;
  }
  return null;
}

function mapMetricsToKpis(provider: string, raw: any) {
  if (provider !== "GOOGLE_ANALYTICS") {
    return {
      impressions: raw.impressions || 0,
      clicks: raw.clicks || 0,
      conversions: raw.conversions || 0,
      spend: raw.spend || 0,
    };
  }

  return {
    impressions: raw.screenPageViews || 0,
    clicks: raw.sessions || raw.totalUsers || 0,
    conversions: raw.conversions || 0,
    spend: raw.totalRevenue || 0,
  };
}

interface PageProps {
  params: {
    provider: string;
  };
  searchParams?: {
    connected?: string;
    error?: string;
  };
}

export default async function ChannelDetailPage({ params, searchParams = {} }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const workspace = await getOrCreateWorkspace(session.user.id);
  
  // Check if OAuth callback just completed
  const oauthConnected = searchParams?.connected === "1";
  const oauthError = searchParams?.error;

  // Convert slug to provider enum
  const provider = slugToProvider(params.provider);

  if (!provider) {
    notFound();
  }

  // Fetch channel data directly from Prisma (similar to dashboard pattern)
  const connection = await prisma.connection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider,
    },
  });

  // Get last 30 days of metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const metrics = await prisma.metricDaily.findMany({
    where: {
      workspaceId: workspace.id,
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
      kpis = mapMetricsToKpis(provider, metricsData);
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Get latest 10 insights
  const insights = await prisma.insight.findMany({
    where: {
      workspaceId: workspace.id,
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
        metrics: mapMetricsToKpis(metric.provider, metricsData),
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

  // Show property selector if OAuth just completed and no property selected yet
  const showPropertySelector = 
    provider === "GOOGLE_ANALYTICS" && 
    oauthConnected && 
    connection?.status !== "CONNECTED";

  return (
    <div>
      {oauthError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            {oauthError === "no_properties" 
              ? "OAuth completed but no GA4 properties found. Please check your Google account permissions."
              : `OAuth error: ${oauthError}`}
          </p>
        </div>
      )}
      
      {showPropertySelector && (
        <div className="mb-6">
          <GA4PropertySelector
            workspaceId={workspace.id}
            userId={session.user.id}
          />
        </div>
      )}
      
      <ChannelDetailContent channelData={channelData} />
    </div>
  );
}

