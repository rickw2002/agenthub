"use client";

import { useMemo, useState } from "react";
import type { Prompt } from "@/lib/prompt-library";
import { mockPrompts } from "@/lib/prompt-library-mock";

interface PromptDetailPageProps {
  params: {
    promptId: string;
  };
}

function findPromptById(promptId: string): Prompt | undefined {
  return mockPrompts.find((prompt) => prompt.id === promptId);
}

function getExplanationSection(prompt: Prompt | undefined, title: string): string | null {
  if (!prompt || typeof prompt.explanation === "string") {
    return null;
  }

  const section = prompt.explanation.sections.find(
    (item) => item.title.toLowerCase() === title.toLowerCase()
  );

  return section?.body ?? null;
}

export default function PromptDetailPage({ params }: PromptDetailPageProps) {
  const prompt = useMemo(() => findPromptById(params.promptId), [params.promptId]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const whatItDoes = getExplanationSection(prompt, "What does this prompt do?");
  const whenToUse = getExplanationSection(prompt, "When should you use this prompt?");
  const howToUse = getExplanationSection(prompt, "How to use this prompt");
  const commonMistakes = getExplanationSection(prompt, "Common mistakes");
  const disclaimer = getExplanationSection(prompt, "Disclaimer");

  const handleCopy = async () => {
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt.fullPrompt);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  if (!prompt) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Prompt not found</h1>
        <p className="text-sm text-gray-600">
          We couldn't find a prompt with ID "{params.promptId}".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Title */}
      <h1 className="text-2xl font-semibold">{prompt.title}</h1>

      {/* 2. Short subtitle/description */}
      <p className="text-sm text-gray-700">{prompt.shortDescription}</p>

      {/* 3. What does this prompt do? */}
      {whatItDoes && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">What does this prompt do?</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{whatItDoes}</p>
        </section>
      )}

      {/* 4. When should you use this prompt? */}
      {whenToUse && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">When should you use this prompt?</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{whenToUse}</p>
        </section>
      )}

      {/* 5. How to use this prompt (step-by-step list) */}
      {howToUse && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">How to use this prompt</h2>
          <ul className="list-decimal list-inside text-sm text-gray-700 whitespace-pre-line space-y-1">
            {howToUse.split(/\d\)/).map((step) => step.trim()).filter(Boolean).map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Full prompt (read-only code block with copy button) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Full prompt</h2>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs px-2 py-1 border rounded-md bg-white text-gray-700"
          >
            {copyStatus === "copied" && "Copied"}
            {copyStatus === "error" && "Copy failed"}
            {copyStatus === "idle" && "Copy prompt"}
          </button>
        </div>
        <pre className="text-xs bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto">
{prompt.fullPrompt}
        </pre>
      </section>

      {/* 7. Common mistakes (optional section) */}
      {commonMistakes && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Common mistakes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{commonMistakes}</p>
        </section>
      )}

      {/* 8. Disclaimer (one line at bottom) */}
      <p className="text-xs text-gray-500 border-t pt-3 mt-4">
        {disclaimer || "Always review AI-generated output before sharing it with customers or stakeholders."}
      </p>
    </div>
  );
}

