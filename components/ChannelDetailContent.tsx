"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ChannelChat from "./ChannelChat";
import InsightList from "./InsightList";
import MiniChart from "./MiniChart";

interface ChannelData {
  provider: string;
  connection: {
    id: string;
    status: string;
  } | null;
  kpis: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
  metrics: Array<{
    id: string;
    date: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    };
    dimensions: any;
  }>;
  insights: Array<{
    id: string;
    title: string;
    summary: string;
    severity: string;
    period: string | null;
    createdAt: string;
  }>;
}

interface ChannelDetailContentProps {
  channelData: ChannelData;
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    GOOGLE_ADS: "Google Ads",
    META_ADS: "Meta Ads",
    LINKEDIN: "LinkedIn",
    WEBSITE: "Website",
    EMAIL: "Email",
    SUPPORT: "Support",
  };
  return names[provider] || provider;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function ChannelDetailContent({ channelData }: ChannelDetailContentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = getProviderDisplayName(channelData.provider);
  const hasData = channelData.metrics.length > 0;
  const isConnected = channelData.connection?.status === "CONNECTED";

  // Extract click values for 30-day chart
  const clickSeries = channelData.metrics.map((item) => ({
    date: item.date,
    value: item.metrics.clicks,
  }));

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: channelData.provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Er is iets misgegaan bij het verbinden");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: channelData.provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Er is iets misgegaan bij het loskoppelen");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/data"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Terug naar Data Hub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Bezig..." : "Loskoppelen"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Bezig..." : "Verbinden"}
            </button>
          )}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>

      {/* KPIs and Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {!hasData ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Geen data beschikbaar voor dit kanaal.</p>
            <p className="text-sm text-gray-400 mt-2">
              {channelData.connection?.status === "NOT_CONNECTED" && "Kanaal niet verbonden"}
              {channelData.connection?.status === "PENDING" && "Wacht op verbinding"}
              {channelData.connection?.status === "ERROR" && "Fout bij verbinding"}
            </p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Impressions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(channelData.kpis.impressions)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Clicks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(channelData.kpis.clicks)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Conversions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(channelData.kpis.conversions)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{channelData.kpis.spend.toFixed(0)}
                </p>
              </div>
            </div>

            {/* 30-day Chart */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">30-daags overzicht (Clicks)</p>
              <MiniChart data={clickSeries} height={200} />
            </div>
          </>
        )}
      </div>

      {/* Channel Chat */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel Chat</h2>
        <ChannelChat provider={channelData.provider} />
      </div>

      {/* Latest Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Laatste inzichten</h2>
        <InsightList insights={channelData.insights} />
      </div>
    </div>
  );
}

