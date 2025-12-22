 "use client";

import { useCallback, useEffect, useState } from "react";

type DraftStatus = "DRAFT" | "APPROVED" | "POSTED";

interface ContentFeedbackV2 {
  id: string;
  postedUrl: string | null;
  impressions: number | null;
  clicks: number | null;
  reactions: number | null;
  comments: number | null;
  qualitativeRating: string | null;
  notes: string | null;
  createdAt: string;
}

interface ContentDraftV2 {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  format: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  feedbacks: ContentFeedbackV2[];
}

interface Props {
  workspaceId: string;
  initialDrafts: ContentDraftV2[];
}

export default function ContentStudioV2({ workspaceId, initialDrafts }: Props) {
  const [drafts, setDrafts] = useState<ContentDraftV2[]>(initialDrafts);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDrafts[0]?.id ?? null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDraft = drafts.find((d) => d.id === selectedId) ?? null;

  const reloadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/content-drafts", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kon drafts niet ophalen");
      }
      const data = await res.json();
      setDrafts(data.drafts ?? []);
      if (!selectedId && data.drafts?.[0]?.id) {
        setSelectedId(data.drafts[0].id);
      }
    } catch (e: any) {
      console.error("[CONTENT_V2] reloadDrafts error", e);
      setError(e.message || "Kon drafts niet opnieuw laden");
    }
  }, [selectedId]);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/v2/content-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "Kon geen nieuwe LinkedIn drafts genereren"
        );
      }
      await reloadDrafts();
    } catch (e: any) {
      console.error("[CONTENT_V2] generate error", e);
      setError(e.message || "Er ging iets mis bij het genereren");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftChange = (field: "title" | "body" | "status", value: any) => {
    if (!selectedDraft) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraft.id
          ? {
              ...d,
              [field]: value,
            }
          : d
      )
    );
  };

  const handleSaveDraft = async () => {
    if (!selectedDraft) return;
    setError(null);
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/v2/content-drafts/${selectedDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedDraft.title,
          body: selectedDraft.body,
          status: selectedDraft.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kon draft niet opslaan");
      }
      await reloadDrafts();
    } catch (e: any) {
      console.error("[CONTENT_V2] save draft error", e);
      setError(e.message || "Er ging iets mis bij het opslaan van de draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const [feedbackForm, setFeedbackForm] = useState({
    postedUrl: "",
    impressions: "",
    clicks: "",
    reactions: "",
    comments: "",
    qualitativeRating: "" as "" | "GOOD" | "OK" | "BAD",
    notes: "",
  });

  useEffect(() => {
    // Reset feedback form als andere draft gekozen wordt
    setFeedbackForm({
      postedUrl: "",
      impressions: "",
      clicks: "",
      reactions: "",
      comments: "",
      qualitativeRating: "",
      notes: "",
    });
  }, [selectedId]);

  const handleFeedbackChange = (
    field: keyof typeof feedbackForm,
    value: string
  ) => {
    setFeedbackForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveFeedback = async () => {
    if (!selectedDraft) return;
    setError(null);
    setIsSavingFeedback(true);
    try {
      const res = await fetch("/api/v2/content-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentDraftId: selectedDraft.id,
          postedUrl: feedbackForm.postedUrl || undefined,
          impressions: feedbackForm.impressions
            ? Number(feedbackForm.impressions)
            : undefined,
          clicks: feedbackForm.clicks ? Number(feedbackForm.clicks) : undefined,
          reactions: feedbackForm.reactions
            ? Number(feedbackForm.reactions)
            : undefined,
          comments: feedbackForm.comments
            ? Number(feedbackForm.comments)
            : undefined,
          qualitativeRating: feedbackForm.qualitativeRating || undefined,
          notes: feedbackForm.notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kon feedback niet opslaan");
      }
      await reloadDrafts();
    } catch (e: any) {
      console.error("[CONTENT_V2] save feedback error", e);
      setError(e.message || "Er ging iets mis bij het opslaan van feedback");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Content Studio v2
          </h1>
          <p className="text-sm text-zinc-500">
            Genereer LinkedIn drafts op basis van je laatste Insight & VoiceCard.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Genereren..." : "Genereer 3 LinkedIn posts"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Drafts lijst */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Drafts</h2>
          <div className="border rounded-lg bg-white divide-y max-h-[480px] overflow-y-auto">
            {drafts.length === 0 && (
              <div className="p-4 text-sm text-zinc-500">
                Nog geen drafts. Klik op &quot;Genereer 3 LinkedIn posts&quot; om te
                starten.
              </div>
            )}
            {drafts.map((draft) => {
              const latestFeedback = [...(draft.feedbacks || [])].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )[0];
              return (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => setSelectedId(draft.id)}
                  className={`w-full text-left p-3 text-sm hover:bg-zinc-50 ${
                    draft.id === selectedId ? "bg-zinc-100" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900 truncate">
                        {draft.title || "(zonder titel)"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{draft.format}</span>
                        <span>•</span>
                        <span>{draft.status}</span>
                        {latestFeedback && (
                          <>
                            <span>•</span>
                            <span>
                              {latestFeedback.impressions ?? 0} impressions
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2 space-y-4">
          {selectedDraft ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">
                  Titel
                </label>
                <input
                  type="text"
                  value={selectedDraft.title}
                  onChange={(e) => handleDraftChange("title", e.target.value)}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">
                  Body
                </label>
                <textarea
                  rows={14}
                  value={selectedDraft.body}
                  onChange={(e) => handleDraftChange("body", e.target.value)}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-600">
                    Status
                  </label>
                  <select
                    value={selectedDraft.status}
                    onChange={(e) =>
                      handleDraftChange("status", e.target.value as DraftStatus)
                    }
                    className="mt-1 block rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="POSTED">POSTED</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="inline-flex items-center rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDraft ? "Opslaan..." : "Draft opslaan"}
                </button>
              </div>

              {/* Feedback form */}
              <div className="mt-6 border-t pt-4 space-y-3">
                <h2 className="text-sm font-medium text-zinc-700">
                  Feedback na posten
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-600">
                      URL van de post (optioneel)
                    </label>
                    <input
                      type="url"
                      value={feedbackForm.postedUrl}
                      onChange={(e) =>
                        handleFeedbackChange("postedUrl", e.target.value)
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-600">
                      Impressions
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feedbackForm.impressions}
                      onChange={(e) =>
                        handleFeedbackChange("impressions", e.target.value)
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-600">
                      Reactions
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feedbackForm.reactions}
                      onChange={(e) =>
                        handleFeedbackChange("reactions", e.target.value)
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-600">
                      Comments
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feedbackForm.comments}
                      onChange={(e) =>
                        handleFeedbackChange("comments", e.target.value)
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-600">
                      Kwalitatieve score
                    </label>
                    <select
                      value={feedbackForm.qualitativeRating}
                      onChange={(e) =>
                        handleFeedbackChange(
                          "qualitativeRating",
                          e.target.value
                        )
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">(geen)</option>
                      <option value="GOOD">GOOD</option>
                      <option value="OK">OK</option>
                      <option value="BAD">BAD</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-600">
                      Notities (optioneel)
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackForm.notes}
                      onChange={(e) =>
                        handleFeedbackChange("notes", e.target.value)
                      }
                      className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={isSavingFeedback}
                    className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingFeedback ? "Feedback opslaan..." : "Feedback opslaan"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
              Geen draft geselecteerd. Kies een draft in de lijst of genereer nieuwe
              posts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

