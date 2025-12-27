"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WeeklyReportV2 {
  id: string;
  workspaceId: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  scoreboard: Record<string, {
    current: number;
    previous: number;
    delta: number;
    deltaPercent: number | null;
  }>;
  insights: string[];
  decisions: Array<{
    action: string;
    reason: string;
  }>;
  risks: Array<{
    risk: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }>;
  createdAt: string;
}

interface Props {
  workspaceId: string;
  initialReports: WeeklyReportV2[];
}

export default function WeeklyReportsV2({ workspaceId, initialReports }: Props) {
  const [reports, setReports] = useState<WeeklyReportV2[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialReports[0]?.id ?? null
  );
  const router = useRouter();

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Weekly Reports</h1>
        <p className="text-sm text-zinc-500">
          Overzicht van wekelijkse rapporten met insights, beslissingen en risico's.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reports list */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Rapporten</h2>
          <div className="border rounded-lg bg-white divide-y max-h-[600px] overflow-y-auto">
            {reports.length === 0 && (
              <div className="p-4 text-sm text-zinc-500">
                Nog geen weekly reports. Reports worden automatisch gegenereerd op zondag.
              </div>
            )}
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={`w-full text-left p-3 text-sm hover:bg-zinc-50 ${
                  report.id === selectedId ? "bg-zinc-100" : "bg-white"
                }`}
              >
                <div className="font-medium text-zinc-900">
                  {formatWeekRange(report.weekStart, report.weekEnd)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {formatDate(report.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report detail */}
        <div className="md:col-span-2 space-y-4">
          {selectedReport ? (
            <>
              <div className="border rounded-lg bg-white p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {formatWeekRange(selectedReport.weekStart, selectedReport.weekEnd)}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Gemaakt op {formatDate(selectedReport.createdAt)}
                  </p>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 mb-2">Samenvatting</h3>
                  <p className="text-sm text-zinc-600">{selectedReport.summary}</p>
                </div>

                {/* Scoreboard */}
                {Object.keys(selectedReport.scoreboard).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 mb-3">Scoreboard</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedReport.scoreboard).map(([key, data]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-zinc-50 rounded text-xs"
                        >
                          <span className="font-medium text-zinc-700">{key}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-600">
                              {data.current.toFixed(1)} (was {data.previous.toFixed(1)})
                            </span>
                            {data.deltaPercent !== null && (
                              <span
                                className={`font-medium ${
                                  data.delta >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {data.delta >= 0 ? "+" : ""}
                                {data.deltaPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {selectedReport.insights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 mb-2">Insights</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600">
                      {selectedReport.insights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {selectedReport.decisions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 mb-2">Aanbevolen beslissingen</h3>
                    <div className="space-y-2">
                      {selectedReport.decisions.map((decision, idx) => (
                        <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="font-medium text-blue-900 text-sm">
                            {decision.action}
                          </div>
                          <div className="text-xs text-blue-700 mt-1">
                            {decision.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {selectedReport.risks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 mb-2">Risico's</h3>
                    <div className="space-y-2">
                      {selectedReport.risks.map((risk, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded border ${
                            risk.severity === "HIGH"
                              ? "bg-red-50 border-red-200"
                              : risk.severity === "MEDIUM"
                              ? "bg-yellow-50 border-yellow-200"
                              : "bg-zinc-50 border-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${
                                risk.severity === "HIGH"
                                  ? "text-red-900"
                                  : risk.severity === "MEDIUM"
                                  ? "text-yellow-900"
                                  : "text-zinc-700"
                              }`}
                            >
                              {risk.risk}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                risk.severity === "HIGH"
                                  ? "bg-red-100 text-red-700"
                                  : risk.severity === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {risk.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
              Geen report geselecteerd. Kies een report in de lijst.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

