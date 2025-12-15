"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTemplate } from "@prisma/client";
import AgentConfigForm from "./AgentConfigForm";

interface AgentDetailProps {
  agent: AgentTemplate;
}

export default function AgentDetail({ agent }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  // Parse configSchema
  let configSchema: any = {};
  try {
    configSchema = JSON.parse(agent.configSchema);
  } catch (e) {
    console.error("Error parsing configSchema:", e);
  }

  // Parse longDescription in bulletpoints (simpele interpretatie)
  const descriptionPoints = agent.longDescription
    .split("\n")
    .filter((line) => line.trim().startsWith("•") || line.trim().startsWith("-"))
    .map((line) => line.trim().replace(/^[•-]\s*/, ""));

  const tabs = [
    { id: "overview", label: "Over deze agent" },
    { id: "installation", label: "Installatie & configuratie" },
    { id: "faq", label: "FAQ" },
    { id: "support", label: "Support" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
            {agent.category}
          </span>
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 capitalize">
            {agent.type}
          </span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              agent.difficulty === "beginner"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {agent.difficulty === "beginner" ? "Beginner-friendly" : "Advanced"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{agent.name}</h1>
        <p className="text-lg text-gray-600">{agent.shortDescription}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video placeholder */}
          {agent.videoUrl ? (
            <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
              <iframe
                src={agent.videoUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Video coming soon</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Tab: Over deze agent */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Over deze agent</h3>
                  {descriptionPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {descriptionPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-primary mr-2">•</span>
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-line">{agent.longDescription}</p>
                  )}
                </div>
              )}

              {/* Tab: Installatie & configuratie */}
              {activeTab === "installation" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Installatie & configuratie
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700">
                      Deze agent kan eenvoudig worden geactiveerd via het configuratieformulier
                      hiernaast. Vul de benodigde instellingen in en klik op &quot;Agent
                      activeren&quot; om te beginnen.
                    </p>
                    <p className="text-gray-700 mt-4">
                      Na activatie wordt de agent automatisch geconfigureerd en kan deze direct
                      worden gebruikt. Je kunt de instellingen op elk moment aanpassen via je
                      dashboard.
                    </p>
                    <p className="text-gray-700 mt-4">
                      Voor technische ondersteuning bij de installatie, neem contact op met ons
                      support team via het Support tabblad.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: FAQ */}
              {activeTab === "faq" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Veelgestelde vragen</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Hoe lang duurt het voordat de agent actief is?
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Na activatie is de agent meestal binnen enkele minuten actief. Bij
                        complexere configuraties kan dit tot 15 minuten duren.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Kan ik de agent later nog aanpassen?
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Ja, je kunt alle instellingen op elk moment aanpassen via je dashboard. De
                        wijzigingen worden automatisch doorgevoerd.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Wat gebeurt er als ik de agent deactiveer?
                      </h4>
                      <p className="text-gray-600 text-sm">
                        De agent stopt met werken, maar alle configuratie en historie blijven
                        bewaard. Je kunt de agent op elk moment weer activeren.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Is er technische kennis vereist?
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Nee, de meeste agents zijn ontworpen voor gebruikers zonder technische
                        achtergrond. Voor advanced agents kan wat meer configuratie nodig zijn.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Hoe kan ik hulp krijgen?
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Neem contact op via het Support tabblad of bekijk de documentatie in de
                        Library sectie.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Support */}
              {activeTab === "support" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Support</h3>
                  <p className="text-gray-700">
                    Heb je hulp nodig bij het gebruik van deze agent? Ons support team staat voor
                    je klaar.
                  </p>
                  <div className="mt-6">
                    <a
                      href="mailto:support@agenthub.nl?subject=Support vraag over agent"
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                    >
                      Neem contact op
                    </a>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Of bezoek de{" "}
                    <a href="/support" className="text-primary hover:underline">
                      Support pagina
                    </a>{" "}
                    voor meer informatie.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuratie paneel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent activeren</h2>
            <AgentConfigForm agent={agent} configSchema={configSchema} />
          </div>
        </div>
      </div>
    </div>
  );
}






