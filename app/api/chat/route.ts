import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const VALID_SCOPES = ["MASTER", "GOOGLE_ADS", "META_ADS", "LINKEDIN", "WEBSITE", "EMAIL", "SUPPORT"] as const;

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
 * API route for chat messages
 * POST /api/chat
 * Body: { scope: "MASTER" | provider, message: string }
 * Stores user message and generates deterministic assistant reply
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Ongeldig JSON formaat" },
        { status: 400 }
      );
    }

    const { scope, message } = body;

    // Validate scope
    if (!scope || typeof scope !== "string") {
      return NextResponse.json(
        { error: "scope is verplicht en moet een string zijn" },
        { status: 400 }
      );
    }

    if (!VALID_SCOPES.includes(scope as any)) {
      return NextResponse.json(
        { error: `Ongeldige scope. Geldige scopes: ${VALID_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is verplicht en mag niet leeg zijn" },
        { status: 400 }
      );
    }

    // Store user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        scope,
        role: "USER",
        content: message.trim(),
      },
    });

    // Generate deterministic reply based on scope
    let assistantReply = "";

    if (scope === "MASTER") {
      // For master scope, get KPIs and insights across all providers
      const providers = ["GOOGLE_ADS", "META_ADS", "LINKEDIN"];
      const allKpis: Array<{ provider: string; kpis: MetricsData }> = [];
      const allInsights: Array<{ provider: string; title: string; summary: string }> = [];

      for (const provider of providers) {
        // Get latest metrics
        const latestMetric = await prisma.metricDaily.findFirst({
          where: {
            userId: user.id,
            provider,
          },
          orderBy: {
            date: "desc",
          },
        });

        if (latestMetric) {
          try {
            const metricsData = JSON.parse(latestMetric.metricsJson) as MetricsData;
            allKpis.push({ provider, kpis: metricsData });
          } catch (e) {
            // Ignore parsing errors
          }
        }

        // Get latest insights
        const insights = await prisma.insight.findMany({
          where: {
            userId: user.id,
            provider,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 2,
        });

        insights.forEach((insight) => {
          allInsights.push({
            provider,
            title: insight.title,
            summary: insight.summary,
          });
        });
      }

      // Generate reply with KPIs and insights
      if (allKpis.length > 0) {
        assistantReply = "Hier is een overzicht van je data:\n\n";
        
        allKpis.forEach(({ provider, kpis }) => {
          assistantReply += `${provider}: ${kpis.impressions} impressions, ${kpis.clicks} clicks, ${kpis.conversions} conversions, €${kpis.spend.toFixed(2)} spend.\n`;
        });

        if (allInsights.length > 0) {
          assistantReply += "\nRecente inzichten:\n";
          allInsights.slice(0, 3).forEach((insight) => {
            assistantReply += `• ${insight.provider}: ${insight.title} - ${insight.summary}\n`;
          });
        }

        assistantReply += "\nIs er iets specifieks dat je wilt weten over je data?";
      } else {
        assistantReply = "Ik zie nog geen data voor je providers. Zodra er data beschikbaar is, kan ik je helpen met analyses en inzichten.";
      }
    } else {
      // For provider-specific scope, get that provider's KPIs and insights
      const latestMetric = await prisma.metricDaily.findFirst({
        where: {
          userId: user.id,
          provider: scope,
        },
        orderBy: {
          date: "desc",
        },
      });

      const insights = await prisma.insight.findMany({
        where: {
          userId: user.id,
          provider: scope,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      if (latestMetric) {
        try {
          const metricsData = JSON.parse(latestMetric.metricsJson) as MetricsData;
          
          assistantReply = `Gebaseerd op je ${scope} data:\n\n`;
          assistantReply += `Laatste metingen: ${metricsData.impressions} impressions, ${metricsData.clicks} clicks, ${metricsData.conversions} conversions, €${metricsData.spend.toFixed(2)} spend.\n`;
          
          if (metricsData.ctr !== undefined) {
            assistantReply += `CTR: ${(metricsData.ctr * 100).toFixed(2)}%.\n`;
          }
          if (metricsData.conversionRate !== undefined) {
            assistantReply += `Conversiepercentage: ${(metricsData.conversionRate * 100).toFixed(2)}%.\n`;
          }

          if (insights.length > 0) {
            assistantReply += "\nRecente inzichten:\n";
            insights.forEach((insight) => {
              assistantReply += `• ${insight.title}: ${insight.summary}\n`;
            });
          }

          assistantReply += "\nHoe kan ik je verder helpen met je " + scope + " data?";
        } catch (e) {
          assistantReply = `Ik kon de data voor ${scope} niet laden. Probeer het later opnieuw.`;
        }
      } else {
        assistantReply = `Ik zie nog geen data voor ${scope}. Zodra er data beschikbaar is, kan ik je helpen met analyses.`;
      }
    }

    // Store assistant reply
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        scope,
        role: "ASSISTANT",
        content: assistantReply,
      },
    });

    return NextResponse.json(
      {
        reply: assistantReply,
        messageId: assistantMessage.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het versturen van het bericht" },
      { status: 500 }
    );
  }
}






