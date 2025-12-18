"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/bureauai/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { FOUNDATIONS_KEYS } from "@/lib/bureauai/foundations";

type QuestionResponse = {
  questionKey: string;
  questionText: string;
  answerType: "text" | "select" | "multi" | "boolean";
  options?: string[];
  stop: boolean;
};

export default function PersonalizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Fetch next question
  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/profile/next-question");
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Fout bij ophalen vraag");
      }

      const data: QuestionResponse = await response.json();
      
      if (data.stop) {
        setCompleted(true);
        setQuestion(null);
        // All questions answered
        setProgress(100);
      } else {
        setQuestion(data);
        setAnswer("");
        setSelectedOptions([]);
        // Calculate progress: find current question index
        // Progress = (answered questions / total questions) * 100
        const currentIndex = FOUNDATIONS_KEYS.indexOf(data.questionKey as any);
        const total = FOUNDATIONS_KEYS.length;
        // Current index is the next unanswered question, so answered = currentIndex
        const answered = currentIndex >= 0 ? currentIndex : 0;
        setProgress(Math.round((answered / total) * 100));
      }
    } catch (err) {
      console.error("[PERSONALIZATION] Fetch error", err);
      setError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het ophalen van de vraag."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const handleSubmit = async () => {
    if (!question) return;

    let answerText = "";
    let answerJson: unknown = null;

    if (question.answerType === "multi") {
      if (selectedOptions.length === 0) {
        setError("Selecteer minimaal één optie");
        return;
      }
      answerText = selectedOptions.join(", ");
      answerJson = selectedOptions;
    } else if (question.answerType === "select") {
      if (!answer.trim()) {
        setError("Selecteer een optie");
        return;
      }
      answerText = answer;
    } else if (question.answerType === "boolean") {
      answerText = answer === "true" ? "Ja" : "Nee";
      answerJson = answer === "true";
    } else {
      // text
      if (!answer.trim()) {
        setError("Vul een antwoord in");
        return;
      }
      answerText = answer.trim();
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/profile/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionKey: question.questionKey,
          answerText,
          answerJson,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Fout bij opslaan antwoord");
      }

      // Fetch next question
      await fetchNextQuestion();
    } catch (err) {
      console.error("[PERSONALIZATION] Submit error", err);
      setError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het opslaan van je antwoord."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectChange = (option: string) => {
    if (question?.answerType === "multi") {
      setSelectedOptions((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    } else {
      setAnswer(option);
    }
  };

  if (loading && !question) {
    return (
      <AppShell title="Personalisatie" description="Vul je profiel in voor betere content">
        <Card>
          <div className="text-center py-8">
            <p className="text-zinc-600">Vragen laden...</p>
          </div>
        </Card>
      </AppShell>
    );
  }

  if (completed) {
    return (
      <AppShell title="Personalisatie" description="Je profiel is compleet">
        <Card>
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                Profiel compleet!
              </h2>
              <p className="text-zinc-600 mb-6">
                Alle vragen zijn beantwoord. Je profiel is nu klaar voor gebruik.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => router.push("/dashboard")}
              >
                Naar dashboard
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setCompleted(false);
                  fetchNextQuestion();
                }}
              >
                Antwoorden bekijken
              </Button>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Personalisatie"
      description="Vul je profiel in voor betere content generatie"
    >
      <div className="space-y-6">
        {/* Progress bar */}
        <Card padding="sm">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Voortgang</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2">
              <div
                className="bg-zinc-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Question card */}
        {question && (
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 mb-2">
                  {question.questionText}
                </h2>
                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}
              </div>

              {/* Answer input based on type */}
              {question.answerType === "text" && (
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Typ je antwoord hier..."
                  rows={4}
                  className="w-full"
                />
              )}

              {question.answerType === "select" && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectChange(option)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        answer === option
                          ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.answerType === "multi" && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectChange(option)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        selectedOptions.includes(option)
                          ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedOptions.includes(option)
                              ? "border-zinc-900 bg-zinc-900"
                              : "border-zinc-300"
                          }`}
                        >
                          {selectedOptions.includes(option) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {question.answerType === "boolean" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAnswer("true")}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                      answer === "true"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswer("false")}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                      answer === "false"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    Nee
                  </button>
                </div>
              )}

              {/* Submit button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Opslaan..." : "Volgende"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

