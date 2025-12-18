"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/bureauai/client";

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
    <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Feedback op deze output
        </h3>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-700">Beoordeling:</span>
        <div className="flex gap-1">
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
              className={`px-2 py-1 text-xs rounded border ${
                rating === value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Opmerking (optioneel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSubmitted(false);
            setSuccessMessage(null);
          }}
          rows={3}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          placeholder="Bijv. 'te salesy', 'klinkt als ik', 'te formeel'..."
          disabled={loading}
        />
      </div>

      {errorMessage && (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          <div>{errorMessage}</div>
          {errorAction && <div className="mt-1 text-[11px]">{errorAction}</div>}
        </div>
      )}

      {successMessage && (
        <div className="mb-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !rating || submitted}
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitted ? "Opgeslagen" : loading ? "Opslaan..." : "Feedback versturen"}
        </button>
      </div>
    </div>
  );
}


