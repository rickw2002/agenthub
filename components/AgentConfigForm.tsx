"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTemplate } from "@prisma/client";

interface AgentConfigFormProps {
  agent: AgentTemplate;
  configSchema: any;
}

export default function AgentConfigForm({ agent, configSchema }: AgentConfigFormProps) {
  const router = useRouter();
  const [agentName, setAgentName] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fields = configSchema?.fields || [];

  const handleFieldChange = (fieldName: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/agents/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentTemplateId: agent.id,
          name: agentName || `${agent.name} - ${new Date().toLocaleDateString()}`,
          config: JSON.stringify(config),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan bij het activeren van de agent");
        setLoading(false);
        return;
      }

      // Redirect naar dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Agent naam */}
      <div>
        <label htmlFor="agentName" className="block text-sm font-medium text-gray-700 mb-1">
          Naam van deze agent-instantie
        </label>
        <input
          id="agentName"
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder={`${agent.name} - Mijn instantie`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Kies een unieke naam om deze instantie te identificeren
        </p>
      </div>

      {/* Dynamische configuratie velden */}
      {fields.map((field: any) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === "email" && (
            <input
              id={field.name}
              type="email"
              required={field.required}
              value={config[field.name] || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.description || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          )}

          {field.type === "text" && (
            <input
              id={field.name}
              type="text"
              required={field.required}
              value={config[field.name] || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.description || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          )}

          {field.type === "select" && (
            <select
              id={field.name}
              required={field.required}
              value={config[field.name] || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">Selecteer een optie</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {field.type === "multiselect" && (
            <div className="space-y-2">
              {field.options?.map((option: string) => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(config[field.name] || []).includes(option)}
                    onChange={(e) => {
                      const current = config[field.name] || [];
                      if (e.target.checked) {
                        handleFieldChange(field.name, [...current, option]);
                      } else {
                        handleFieldChange(
                          field.name,
                          current.filter((v: string) => v !== option)
                        );
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {field.type === "boolean" && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config[field.name] || field.default || false}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">{field.description || ""}</span>
            </label>
          )}

          {field.description && field.type !== "boolean" && (
            <p className="mt-1 text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      ))}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? "Activeren..." : "Agent activeren"}
      </button>
    </form>
  );
}











