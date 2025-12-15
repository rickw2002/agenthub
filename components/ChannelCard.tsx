"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProviderSummary {
  provider: string;
  status: string;
  kpis: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
  series7d: Array<{
    date: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    };
  }>;
  latestInsights: Array<{
    id: string;
    title: string;
    summary: string;
    severity: string;
    createdAt: string;
  }>;
}

interface ChannelCardProps {
  summary: ProviderSummary;
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

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "CONNECTED":
      return "bg-green-100 text-green-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ERROR":
      return "bg-red-100 text-red-800";
    case "NOT_CONNECTED":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusDisplayName(status: string): string {
  const names: Record<string, string> = {
    CONNECTED: "Verbonden",
    PENDING: "In behandeling",
    ERROR: "Fout",
    NOT_CONNECTED: "Niet verbonden",
  };
  return names[status] || status;
}

function providerToSlug(provider: string): string {
  return provider.toLowerCase().replace(/_/g, "_");
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

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-gray-400">
        Geen data
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1; // Avoid division by zero

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <div className="h-12 w-full">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function ChannelCard({ summary }: ChannelCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerSlug = providerToSlug(summary.provider);
  const displayName = getProviderDisplayName(summary.provider);
  const statusColor = getStatusBadgeColor(summary.status);
  const statusDisplay = getStatusDisplayName(summary.status);

  // Extract click values for sparkline (7-day series)
  const clickSeries = summary.series7d.map((item) => item.metrics.clicks);

  const hasData = summary.status === "CONNECTED" && summary.kpis.impressions > 0;
  const isConnected = summary.status === "CONNECTED";

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: summary.provider }),
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

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: summary.provider }),
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
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <Link href={`/data/${providerSlug}`} className="flex-1">
          <h3 className="font-semibold text-gray-900 hover:text-primary transition-colors">
            {displayName}
          </h3>
        </Link>
        <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
          {statusDisplay}
        </span>
      </div>

      {/* Connect/Disconnect Button */}
      <div className="mb-4">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Bezig..." : "Loskoppelen"}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Bezig..." : "Verbinden"}
          </button>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">Geen data beschikbaar</p>
          <p className="text-xs text-gray-400 mt-1">
            {summary.status === "NOT_CONNECTED" && "Kanaal niet verbonden"}
            {summary.status === "PENDING" && "Wacht op verbinding"}
            {summary.status === "ERROR" && "Fout bij verbinding"}
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-500">Impressions</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(summary.kpis.impressions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Clicks</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(summary.kpis.clicks)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Conversions</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(summary.kpis.conversions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spend</p>
              <p className="text-lg font-semibold text-gray-900">
                €{summary.kpis.spend.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">7-daags overzicht (clicks)</p>
            <MiniSparkline data={clickSeries} />
          </div>

          {/* Latest Insight Preview */}
          {summary.latestInsights.length > 0 && (
            <Link href={`/data/${providerSlug}`}>
              <div className="border-t border-gray-100 pt-3 cursor-pointer hover:text-primary transition-colors">
                <p className="text-xs text-gray-500 mb-1">Laatste inzicht</p>
                <p className="text-sm text-gray-900 truncate">
                  {summary.latestInsights[0].title}
                </p>
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

