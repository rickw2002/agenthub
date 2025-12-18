"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/bureauai/client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

type OutputFeedbackProps = {
  outputId: string;
  initialRating?: number;
  initialNotes?: string;
  onSubmitted?: (result: { newProfileVersion: number }) => void;
};

export function OutputFeedback({
  outputId,
  initialRating,
  initialNotes,
  onSubmitted,
}: OutputFeedbackProps) {
  const [rating, setRating] = useState<number | null>(
    initialRating ?? null
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating || loading) return;
    setLoading(true);
    setErrorMessage(null);
    setErrorAction(null);
    setSuccessMessage(null);

    try {
      const res = await submitFeedback({
        outputId,
        rating,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage(`Opgeslagen. Profielversie: v${res.newProfileVersion}`);
      setSubmitted(true);
      if (onSubmitted) {
        onSubmitted({ newProfileVersion: res.newProfileVersion });
      }
    } catch (err: any) {
      setErrorMessage(
        typeof err?.message === "string"
          ? err.message
          : "Er is iets misgegaan bij het opslaan van feedback."
      );
      if (typeof err?.action === "string") {
        setErrorAction(err.action);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6" padding="md">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-zinc-900 mb-4">
          Feedback op deze output
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-zinc-700">Beoordeling:</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (!loading) {
                    setRating(value);
                    setSubmitted(false);
                    setSuccessMessage(null);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                  rating === value
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={loading}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Opmerking (optioneel)"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSubmitted(false);
            setSuccessMessage(null);
          }}
          rows={3}
          placeholder="Bijv. 'te salesy', 'klinkt als ik', 'te formeel'..."
          disabled={loading}
        />
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
          <div>{errorMessage}</div>
          {errorAction && <div className="mt-1.5 text-[11px] text-zinc-600">{errorAction}</div>}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || !rating || submitted}
          variant="primary"
          size="md"
        >
          {submitted ? "Opgeslagen" : loading ? "Opslaan..." : "Feedback versturen"}
        </Button>
      </div>
    </Card>
  );
}


