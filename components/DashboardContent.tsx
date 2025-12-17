"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAgent, RunLog } from "@prisma/client";
import { AgentTemplate } from "@prisma/client";

interface UserAgentWithTemplate extends UserAgent {
  agentTemplate: {
    name: string;
    slug: string;
    category: string;
  };
}

interface RunLogWithUserAgent extends RunLog {
  userAgent: {
    name: string;
    agentTemplate: {
      name: string;
    };
  };
}

interface DashboardContentProps {
  userName: string;
  userAgents: UserAgentWithTemplate[];
  runLogs: RunLogWithUserAgent[];
}

export default function DashboardContent({
  userName,
  userAgents,
  runLogs,
}: DashboardContentProps) {
  const router = useRouter();
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [simulatingRuns, setSimulatingRuns] = useState<Set<string>>(new Set());
  const [simulationErrors, setSimulationErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const isDevelopment = process.env.NODE_ENV !== "production";
  const serviceKey = process.env.NEXT_PUBLIC_AGENT_SERVICE_KEY;

  const handleRunAgent = async (userAgentId: string) => {
    // Clear any previous error for this agent
    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[userAgentId];
      return newErrors;
    });

    // Set loading state
    setRunningAgents((prev) => new Set(prev).add(userAgentId));

    try {
      const response = await fetch("/api/executions/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userAgentId,
          input: {}, // Empty input for now - can be extended later
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessages((prev) => ({
          ...prev,
          [userAgentId]: data.error || "Er is iets misgegaan bij het starten van de run",
        }));
        return;
      }

      // Success: refresh dashboard data
      router.refresh();
    } catch (error) {
      setErrorMessages((prev) => ({
        ...prev,
        [userAgentId]: error instanceof Error ? error.message : "Er is iets misgegaan. Probeer het opnieuw.",
      }));
    } finally {
      // Remove loading state
      setRunningAgents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userAgentId);
        return newSet;
      });
    }
  };

  const handleSimulateSuccess = async (runId: string) => {
    if (!serviceKey) {
      setSimulationErrors((prev) => ({
        ...prev,
        [runId]: "NEXT_PUBLIC_AGENT_SERVICE_KEY niet geconfigureerd",
      }));
      return;
    }

    // Clear any previous error
    setSimulationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[runId];
      return newErrors;
    });

    // Set loading state
    setSimulatingRuns((prev) => new Set(prev).add(runId));

    try {
      const response = await fetch("/api/runs/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AGENT-SERVICE-KEY": serviceKey,
        },
        body: JSON.stringify({
          runId,
          status: "success",
          summary: "Test run completed",
          resultUrl: "https://example.com",
          metadata: { test: true },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSimulationErrors((prev) => ({
          ...prev,
          [runId]: data.error || "Er is iets misgegaan bij het simuleren",
        }));
        return;
      }

      // Success: refresh dashboard data
      router.refresh();
    } catch (error) {
      setSimulationErrors((prev) => ({
        ...prev,
        [runId]: "Er is iets misgegaan. Probeer het opnieuw.",
      }));
    } finally {
      // Remove loading state
      setSimulatingRuns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  // Onboarding checklist items (statisch)
  const onboardingItems = [
    {
      id: 1,
      text: "Kijk de introductievideo",
      completed: false, // Voor nu statisch
    },
    {
      id: 2,
      text: "Activeer je eerste agent",
      completed: userAgents.length > 0,
    },
    {
      id: 3,
      text: "Configureer je eerste workflow",
      completed: userAgents.some((ua) => ua.agentTemplate.category === "Operations"),
    },
    {
      id: 4,
      text: "Bekijk de Library voor tips",
      completed: false, // Voor nu statisch
    },
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "incomplete":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRunLogStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "queued":
        return "bg-gray-100 text-gray-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy ID:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welkom blok */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welkom, {userName}!</h1>
        <p className="text-gray-600">
          Dit is je dashboard waar je een overzicht hebt van je geactiveerde agents en recente
          activiteit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linker kolom - Onboarding & Actieve agents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onboarding checklist */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Onboarding checklist</h2>
            <div className="space-y-3">
              {onboardingItems.map((item) => (
                <div key={item.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    readOnly
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">{item.text}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Mijn actieve agents */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mijn actieve agents</h2>
            {userAgents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Je hebt nog geen agents geactiveerd.</p>
                <Link
                  href="/agents"
                  className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
                >
                  Bekijk agents catalogus
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userAgents.map((userAgent) => (
                  <div
                    key={userAgent.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{userAgent.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {userAgent.agentTemplate.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">ID: {userAgent.id}</span>
                          <button
                            onClick={() => handleCopyId(userAgent.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === userAgent.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                          userAgent.status
                        )}`}
                      >
                        {userAgent.status}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunAgent(userAgent.id)}
                          disabled={runningAgents.has(userAgent.id)}
                          className="flex-1 text-center text-sm bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {runningAgents.has(userAgent.id) ? "Bezig..." : "Run"}
                        </button>
                        <Link
                          href={`/agents/${userAgent.agentTemplate.slug}`}
                          className="flex-1 text-center text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Ga naar detail
                        </Link>
                      </div>
                      {errorMessages[userAgent.id] && (
                        <p className="text-xs text-red-600">{errorMessages[userAgent.id]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rechter kolom - Recente activiteit */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recente activiteit</h2>
            {runLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Nog geen activiteit</p>
                <p className="text-xs text-gray-400 mt-2">
                  Run logs verschijnen hier zodra je agents actief zijn
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {runLogs.map((log) => (
                  <div key={log.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getRunLogStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {log.userAgent.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{log.summary}</p>
                    {/* Developer-only simulate button for running runs */}
                    {isDevelopment && log.status === "running" && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleSimulateSuccess(log.id)}
                          disabled={simulatingRuns.has(log.id)}
                          className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {simulatingRuns.has(log.id) ? "Simulating..." : "Simulate Success"}
                        </button>
                        {simulationErrors[log.id] && (
                          <p className="text-xs text-red-600 mt-1">{simulationErrors[log.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

