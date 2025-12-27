interface Insight {
  id: string;
  title: string;
  summary: string;
  severity: string;
  period: string | null;
  createdAt: string;
}

interface InsightListProps {
  insights: Insight[];
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case "INFO":
      return "bg-blue-100 text-blue-800";
    case "WARNING":
      return "bg-yellow-100 text-yellow-800";
    case "CRITICAL":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getSeverityDisplayName(severity: string): string {
  const names: Record<string, string> = {
    INFO: "Info",
    WARNING: "Waarschuwing",
    CRITICAL: "Kritiek",
  };
  return names[severity] || severity;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function InsightList({ insights }: InsightListProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">Nog geen inzichten beschikbaar</p>
        <p className="text-xs text-gray-400 mt-2">
          Inzichten verschijnen hier zodra er data beschikbaar is
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <div key={insight.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getSeverityBadgeColor(
                    insight.severity
                  )}`}
                >
                  {getSeverityDisplayName(insight.severity)}
                </span>
                {insight.period && (
                  <span className="text-xs text-gray-500">({insight.period})</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
              <p className="text-sm text-gray-600">{insight.summary}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{formatDate(insight.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}











