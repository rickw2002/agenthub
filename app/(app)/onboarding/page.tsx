"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stap 1
  const [rol, setRol] = useState("");
  const [branche, setBranche] = useState("");
  const [teamGrootte, setTeamGrootte] = useState("");

  // Stap 2
  const [werkstijl, setWerkstijl] = useState("");
  const [tools, setTools] = useState("");
  const [tijdverspillers, setTijdverspillers] = useState("");

  // Stap 3
  const [doelen, setDoelen] = useState("");
  const [frustraties, setFrustraties] = useState("");
  const [aiVerwachtingen, setAiVerwachtingen] = useState("");

  // Stap 4
  const [feedback, setFeedback] = useState("");
  const [gewensteAgents, setGewensteAgents] = useState("");

  const handleNext = () => {
    setError(null);
    setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev));
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const profileJson = {
        rol,
        branche,
        teamGrootte,
      };

      const goalsJson = {
        doelen,
        frustraties,
        aiVerwachtingen,
      };

      const preferencesJson = {
        werkstijl,
        tools,
        tijdverspillers,
        feedback,
        gewensteAgents,
      };

      const response = await fetch("/api/context", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileJson,
          goalsJson,
          preferencesJson,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "Er is iets misgegaan bij het opslaan van je gegevens"
        );
      }

      router.push("/dashboard");
    } catch (e) {
      console.error("[ONBOARDING] Submit error", e);
      setError(
        e instanceof Error
          ? e.message
          : "Er is iets misgegaan. Probeer het later opnieuw."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Stap 1: Over jou en je bedrijf
            </h1>
            <p className="text-gray-600 mb-6">
              Vertel kort wie je bent en in welke context je AgentHub gaat
              gebruiken.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Bijv. eigenaar, marketeer, operations manager"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branche
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Bijv. e-commerce, B2B SaaS, agency"
                  value={branche}
                  onChange={(e) => setBranche(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teamgrootte
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Bijv. solo, 2-10, 10-50"
                  value={teamGrootte}
                  onChange={(e) => setTeamGrootte(e.target.value)}
                />
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Stap 2: Hoe werk je nu?
            </h1>
            <p className="text-gray-600 mb-6">
              Zo begrijpen we beter hoe AI-agents je kunnen ondersteunen in je
              dagelijkse werk.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Werkstijl
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Bijv. veel ad-hoc taken, gestructureerde planning, veel klantcontact..."
                  value={werkstijl}
                  onChange={(e) => setWerkstijl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belangrijkste tools
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Bijv. Google Ads, Meta Ads, CRM, e-mail, Slack..."
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grootste tijdverspillers
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Bijv. rapportages maken, data verzamelen, terugkerende e-mails..."
                  value={tijdverspillers}
                  onChange={(e) => setTijdverspillers(e.target.value)}
                />
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Stap 3: Doelen en verwachtingen
            </h1>
            <p className="text-gray-600 mb-6">
              Waar hoop je dat AgentHub het meeste impact maakt?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belangrijkste doelen
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Bijv. meer leads, lagere CPA, beter inzicht in data..."
                  value={doelen}
                  onChange={(e) => setDoelen(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grootste frustraties nu
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Wat frustreert je het meest in je huidige marketing/operations?"
                  value={frustraties}
                  onChange={(e) => setFrustraties(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verwachtingen van AI en agents
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Waar moeten AI-agents jou concreet mee helpen?"
                  value={aiVerwachtingen}
                  onChange={(e) => setAiVerwachtingen(e.target.value)}
                />
              </div>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Stap 4: Feedback en gewenste agents
            </h1>
            <p className="text-gray-600 mb-6">
              Help ons AgentHub beter maken voor jouw situatie.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback op AgentHub (optioneel)
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Wat mis je nog? Wat moet er absoluut in blijven?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gewenste agents of automatiseringen
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Bijv. Google Ads optimalisatie agent, rapportage agent, inbox-triage agent..."
                  value={gewensteAgents}
                  onChange={(e) => setGewensteAgents(e.target.value)}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">
          Onboarding • Stap {step} van 4
        </span>
      </div>

      {renderStepContent()}

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={step === 1 || isSubmitting}
          className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Vorige
        </button>
        <div className="flex gap-3">
          {step < 4 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Volgende
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Bezig met opslaan..." : "Opslaan en naar dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


