import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = ["GOOGLE_ADS", "GOOGLE_ANALYTICS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

interface MetricsData {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr?: number;
  cpc?: number;
  conversionRate?: number;
}

/**
 * API route for channel detail data
 * GET /api/data/channel?provider=...
 * Returns connection, last 30 days metrics, and latest insights for a specific provider
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAuth();
    if (authError) {
      return authError;
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const workspace = await getOrCreateWorkspace(user.id);

    // Get provider from query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "provider query parameter is verplicht" },
        { status: 400 }
      );
    }

    // Validate provider
    if (!VALID_PROVIDERS.includes(provider as any)) {
      return NextResponse.json(
        { error: `Ongeldige provider. Geldige providers: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Get connection
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
        const metricsData = JSON.parse(latestMetric.metricsJson) as MetricsData;
        kpis = {
          impressions: metricsData.impressions || 0,
          clicks: metricsData.clicks || 0,
          conversions: metricsData.conversions || 0,
          spend: metricsData.spend || 0,
        };
      } catch (e) {
        console.error(`Error parsing metrics for ${provider}:`, e);
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
        const metricsData = JSON.parse(metric.metricsJson) as MetricsData;
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

    return NextResponse.json(
      {
        provider,
        connection,
        kpis,
        metrics: formattedMetrics,
        insights: formattedInsights,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Channel detail error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van de channel data" },
      { status: 500 }
    );
  }
}






