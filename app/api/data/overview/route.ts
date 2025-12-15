import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const PROVIDERS = ["GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

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
 * API route for Data Hub overview
 * GET /api/data/overview
 * Returns connections with last 7 days metrics and latest insights per provider
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

    // Get all connections for user, or create NOT_CONNECTED entries for missing providers
    const connections = await prisma.connection.findMany({
      where: { userId: user.id },
    });

    const connectionMap = new Map(connections.map((c) => [c.provider, c]));

    // Get last 7 days of metrics for each provider
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const allMetrics = await prisma.metricDaily.findMany({
      where: {
        userId: user.id,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get latest insights for each provider
    const allInsights = await prisma.insight.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Build response with provider summaries
    const summaries = PROVIDERS.map((provider) => {
      const connection = connectionMap.get(provider);
      const status = connection?.status || "NOT_CONNECTED";
      
      const providerMetrics = allMetrics.filter((m) => m.provider === provider);
      const providerInsights = allInsights
        .filter((i) => i.provider === provider)
        .slice(0, 3);

      // Compute KPIs from latest day's metrics
      let kpis = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      };

      if (providerMetrics.length > 0) {
        const latestMetrics = providerMetrics[providerMetrics.length - 1];
        try {
          const metricsData = JSON.parse(latestMetrics.metricsJson) as MetricsData;
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

      // Build 7-day series
      const series7d = providerMetrics.map((metric) => {
        try {
          const metricsData = JSON.parse(metric.metricsJson) as MetricsData;
          return {
            date: metric.date.toISOString().split("T")[0],
            metrics: {
              impressions: metricsData.impressions || 0,
              clicks: metricsData.clicks || 0,
              conversions: metricsData.conversions || 0,
              spend: metricsData.spend || 0,
            },
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

      // Format insights
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

    return NextResponse.json({ summaries }, { status: 200 });
  } catch (error) {
    console.error("Data overview error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het ophalen van de data" },
      { status: 500 }
    );
  }
}

