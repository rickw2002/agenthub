"use client";

import MasterChat from "./MasterChat";
import ChannelCard from "./ChannelCard";

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

interface DataHubContentProps {
  overviewData: {
    summaries: ProviderSummary[];
  } | null;
}

export default function DataHubContent({ overviewData }: DataHubContentProps) {
  if (!overviewData || !overviewData.summaries) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Hub</h1>
          <p className="text-gray-600">
            Er is een fout opgetreden bij het laden van de data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Hub</h1>
        <p className="text-gray-600">
          Overzicht van al je data-kanalen en inzichten in één overzicht.
        </p>
      </div>

      {/* Master Chat */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Master Chat</h2>
        <MasterChat />
      </div>

      {/* Channel Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data-kanalen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {overviewData.summaries.map((summary) => (
            <ChannelCard key={summary.provider} summary={summary} />
          ))}
        </div>
      </div>
    </div>
  );
}











