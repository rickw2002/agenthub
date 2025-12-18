"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { OutputFeedback } from "@/components/bureauai/OutputFeedback";

export default function BureauAIPage() {
  // 3 hoofdmodi: Brainstorm, Thought to Post, Content Bank
  const [activeMode, setActiveMode] = useState<"brainstorm" | "thought-to-post" | "content-bank">("thought-to-post");
  
  // Binnen Thought to Post: LinkedIn of Blog
  const [activeChannel, setActiveChannel] = useState<"linkedin" | "blog">("linkedin");

  // LinkedIn generator state
  const [thought, setThought] = useState("");
  const [lengthMode, setLengthMode] = useState<"short" | "medium" | "long">("medium");
  const [postType, setPostType] = useState<"TOFU" | "MOFU" | "BOFU" | "">("");
  const [funnelPhase, setFunnelPhase] = useState<string>("");
  const [linkedinContent, setLinkedinContent] = useState<string | null>(null);
  const [linkedinOutputId, setLinkedinOutputId] = useState<string | null>(null);
  const [linkedinProfileVersion, setLinkedinProfileVersion] = useState<number | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  // Blog generator state
  const [blogThought, setBlogThought] = useState("");
  const [blogLengthMode, setBlogLengthMode] = useState<"short" | "medium" | "long">("medium");
  const [blogPostType, setBlogPostType] = useState<"TOFU" | "MOFU" | "BOFU" | "">("");
  const [blogFunnelPhase, setBlogFunnelPhase] = useState<string>("");
  const [blogContent, setBlogContent] = useState<string | null>(null);
  const [blogOutputId, setBlogOutputId] = useState<string | null>(null);
  const [blogProfileVersion, setBlogProfileVersion] = useState<number | null>(null);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);

  // Brainstorm state
  const [brainstormTopic, setBrainstormTopic] = useState("");
  const [brainstormIdeas, setBrainstormIdeas] = useState<string[]>([]);
  const [brainstormLoading, setBrainstormLoading] = useState(false);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);

  // Content Bank state
  const [contentBankFilter, setContentBankFilter] = useState<"favorites" | "all" | "sources">("all");
  const [contentBankSearch, setContentBankSearch] = useState("");
  const [contentBankPostType, setContentBankPostType] = useState<"TOFU" | "MOFU" | "BOFU" | "">("");
  const [contentBankFunnelPhase, setContentBankFunnelPhase] = useState<string>("");
  const [outputs, setOutputs] = useState<any[]>([]);
  const [contentBankLoading, setContentBankLoading] = useState(false);
  const [contentBankError, setContentBankError] = useState<string | null>(null);

  const handleGenerateLinkedin = async () => {
    if (!thought.trim() || linkedinLoading) return;

    setLinkedinLoading(true);
    setLinkedinError(null);
    setLinkedinContent(null);
    setLinkedinOutputId(null);

    try {
      const res = await fetch("/api/generate/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: null,
          thought: thought.trim(),
          length: lengthMode,
          postType: postType || undefined,
          funnelPhase: funnelPhase || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data?.message ||
          "Er is iets misgegaan bij het genereren van de LinkedIn-post.";
        const action = data?.action ? ` ${data.action}` : "";
        throw new Error(message + action);
      }

      setLinkedinContent(data.content ?? null);
      setLinkedinOutputId(data.outputId ?? null);
    } catch (err) {
      setLinkedinError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het genereren van de LinkedIn-post."
      );
    } finally {
      setLinkedinLoading(false);
    }
  };

  const handleGenerateBlog = async () => {
    if (!blogThought.trim() || blogLoading) return;

    setBlogLoading(true);
    setBlogError(null);
    setBlogContent(null);
    setBlogOutputId(null);

    try {
      const res = await fetch("/api/generate/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: null,
          thought: blogThought.trim(),
          length: blogLengthMode,
          postType: blogPostType || undefined,
          funnelPhase: blogFunnelPhase || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data?.message ||
          "Er is iets misgegaan bij het genereren van de blog.";
        const action = data?.action ? ` ${data.action}` : "";
        throw new Error(message + action);
      }

      setBlogContent(data.content ?? null);
      setBlogOutputId(data.outputId ?? null);
    } catch (err) {
      setBlogError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het genereren van de blog."
      );
    } finally {
      setBlogLoading(false);
    }
  };

  // Hoofdmodi tabs
  const mainModeTabs = [
    { id: "brainstorm", label: "Brainstorm" },
    { id: "thought-to-post", label: "Thought to Post" },
    { id: "content-bank", label: "Content Bank" },
  ];

  // Sub-tabs voor Thought to Post
  const channelTabs = [
    { id: "linkedin", label: "LinkedIn" },
    { id: "blog", label: "Blog" },
  ];

  const handleModeChange = (modeId: string) => {
    setActiveMode(modeId as "brainstorm" | "thought-to-post" | "content-bank");
  };

  const handleChannelChange = (channelId: string) => {
    setActiveChannel(channelId as "linkedin" | "blog");
  };

  const handleBrainstorm = async () => {
    if (brainstormLoading) return;

    setBrainstormLoading(true);
    setBrainstormError(null);
    setBrainstormIdeas([]);

    try {
      const res = await fetch("/api/generate/brainstorm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: null,
          topic: brainstormTopic.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data?.message ||
          "Er is iets misgegaan bij het genereren van content ideeën.";
        const action = data?.action ? ` ${data.action}` : "";
        throw new Error(message + action);
      }

      setBrainstormIdeas(data.ideas ?? []);
    } catch (err) {
      setBrainstormError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het genereren van content ideeën."
      );
    } finally {
      setBrainstormLoading(false);
    }
  };

  // Fetch outputs for Content Bank
  const fetchOutputs = async () => {
    setContentBankLoading(true);
    setContentBankError(null);

    try {
      const params = new URLSearchParams({
        filter: contentBankFilter,
        ...(contentBankSearch && { search: contentBankSearch }),
        ...(contentBankPostType && { postType: contentBankPostType }),
        ...(contentBankFunnelPhase && { funnelPhase: contentBankFunnelPhase }),
      });

      const res = await fetch(`/api/outputs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.message || "Fout bij ophalen outputs");
      }

      setOutputs(data.outputs ?? []);
    } catch (err) {
      setContentBankError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het ophalen van outputs."
      );
    } finally {
      setContentBankLoading(false);
    }
  };

  // Fetch outputs when Content Bank mode is active or filter changes
  useEffect(() => {
    if (activeMode === "content-bank") {
      fetchOutputs();
    }
  }, [activeMode, contentBankFilter, contentBankPostType, contentBankFunnelPhase]);

  // Debounced search
  useEffect(() => {
    if (activeMode === "content-bank") {
      const timer = setTimeout(() => {
        fetchOutputs();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [contentBankSearch, activeMode]);

  const handleToggleFavorite = async (outputId: string) => {
    try {
      const res = await fetch(`/api/outputs/${outputId}/favorite`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.message || "Fout bij bijwerken favoriet");
      }

      // Update local state
      setOutputs((prev) =>
        prev.map((output) =>
          output.id === outputId
            ? {
                ...output,
                inputJson: {
                  ...output.inputJson,
                  isFavorite: data.isFavorite,
                },
              }
            : output
        )
      );
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleDeleteOutput = async (outputId: string) => {
    if (!confirm("Weet je zeker dat je deze output wilt verwijderen?")) {
      return;
    }

    try {
      const res = await fetch(`/api/outputs/${outputId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.message || "Fout bij verwijderen");
      }

      // Remove from local state
      setOutputs((prev) => prev.filter((output) => output.id !== outputId));
    } catch (err) {
      console.error("Error deleting output:", err);
      alert("Fout bij verwijderen. Probeer het opnieuw.");
    }
  };

  const handleUseOutput = (output: any) => {
    // Switch to Thought to Post and load content
    setActiveMode("thought-to-post");
    const thought = output.inputJson?.thought || output.inputJson?.topic || output.content.substring(0, 200) || "";
    
    if (output.channel === "linkedin" || output.channel === "LINKEDIN") {
      setActiveChannel("linkedin");
      setThought(thought);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (output.channel === "blog" || output.channel === "BLOG") {
      setActiveChannel("blog");
      setBlogThought(thought);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
          Bureau-AI
        </h1>
        <p className="text-sm text-zinc-600">
          Genereer gepersonaliseerde content voor LinkedIn en blogs.
        </p>
        {linkedinProfileVersion != null && (
          <p className="text-xs text-zinc-500 mt-2">
            Actieve profielversie: v{linkedinProfileVersion}
          </p>
        )}
      </div>

      <Card>
        {/* Hoofdmodi tabs */}
        <Tabs
          tabs={mainModeTabs}
          activeTab={activeMode}
          onTabChange={handleModeChange}
        />

        <div className="mt-6">
          {/* Brainstorm Mode */}
          {activeMode === "brainstorm" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-medium text-zinc-900 mb-2">
                  Brainstorm
                </h2>
                <p className="text-sm text-zinc-600 mb-6">
                  Laat AI je helpen bij het bedenken van content ideeën
                </p>
                {brainstormError && (
                  <div className="mb-4 p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
                    {brainstormError}
                  </div>
                )}
                <div className="space-y-4">
                  <Textarea
                    label="Over welk onderwerp zou je meer content ideeën willen? (optioneel)"
                    value={brainstormTopic}
                    onChange={(e) => setBrainstormTopic(e.target.value)}
                    rows={4}
                    placeholder="Bijvoorbeeld: AI implementatie binnen MKB bedrijven..."
                    disabled={brainstormLoading}
                  />
                  <div className="flex items-end justify-end gap-4">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleBrainstorm}
                      disabled={brainstormLoading}
                    >
                      {brainstormLoading ? "Genereren..." : "Genereer ideeën"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Brainstorm Results */}
              {brainstormIdeas.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-200">
                  <h3 className="text-sm font-medium text-zinc-900 mb-4">
                    Content ideeën ({brainstormIdeas.length})
                  </h3>
                  <div className="space-y-3">
                    {brainstormIdeas.map((idea, index) => (
                      <div
                        key={index}
                        className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-zinc-500">
                                Idee {index + 1}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-900 leading-relaxed">
                              {idea}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Later: opslaan naar Content Bank
                              // Voor nu: kopieer naar Thought to Post
                              setActiveMode("thought-to-post");
                              if (activeChannel === "linkedin") {
                                setThought(idea);
                              } else {
                                setBlogThought(idea);
                              }
                            }}
                            className="flex-shrink-0"
                          >
                            Gebruik
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thought to Post Mode */}
          {activeMode === "thought-to-post" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-medium text-zinc-900 mb-2">
                  Thought to Post
                </h2>
                <p className="text-sm text-zinc-600 mb-4">
                  Laat AI je helpen bij het uitwerken van jouw gedachten tot een post
                </p>
                
                {/* Sub-tabs voor LinkedIn/Blog */}
                <div className="mb-6">
                  <Tabs
                    tabs={channelTabs}
                    activeTab={activeChannel}
                    onTabChange={handleChannelChange}
                  />
                </div>
              </div>

              {/* LinkedIn Channel */}
              {activeChannel === "linkedin" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-medium text-zinc-900 mb-4">
                      LinkedIn thought → post
                    </h2>
                    {linkedinError && (
                      <div className="mb-4 p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
                        {linkedinError}
                      </div>
                    )}
                    <div className="space-y-4">
                      <Textarea
                        label="Thought"
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        rows={4}
                        placeholder="Vertel in je eigen woorden waar de post over moet gaan..."
                        disabled={linkedinLoading}
                      />
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex-1 max-w-xs">
                          <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                            Lengte
                          </label>
                          <select
                            value={lengthMode}
                            onChange={(e) =>
                              setLengthMode(e.target.value as "short" | "medium" | "long")
                            }
                            disabled={linkedinLoading}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="short">Kort</option>
                            <option value="medium">Middel</option>
                            <option value="long">Lang</option>
                          </select>
                        </div>
                        <Button
                          onClick={handleGenerateLinkedin}
                          disabled={linkedinLoading || thought.trim().length < 10}
                          variant="primary"
                          size="md"
                        >
                          {linkedinLoading ? "Genereren..." : "Werk uit"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {linkedinContent && (
                    <div className="mt-6 pt-6 border-t border-zinc-200">
                      <h3 className="text-sm font-medium text-zinc-900 mb-3">
                        Gegenereerde post
                      </h3>
                      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <div className="whitespace-pre-wrap text-sm text-zinc-900 leading-relaxed">
                          {linkedinContent}
                        </div>
                      </div>
                      {linkedinOutputId && (
                        <OutputFeedback
                          outputId={linkedinOutputId}
                          onSubmitted={(r) =>
                            setLinkedinProfileVersion(r.newProfileVersion)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Blog Channel */}
              {activeChannel === "blog" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-medium text-zinc-900 mb-4">
                      Blog thought → artikel
                    </h2>
                    {blogError && (
                      <div className="mb-4 p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
                        {blogError}
                      </div>
                    )}
                    <div className="space-y-4">
                      <Textarea
                        label="Thought"
                        value={blogThought}
                        onChange={(e) => setBlogThought(e.target.value)}
                        rows={4}
                        placeholder="Vertel in je eigen woorden waar het blogartikel over moet gaan..."
                        disabled={blogLoading}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                            Lengte
                          </label>
                          <select
                            value={blogLengthMode}
                            onChange={(e) =>
                              setBlogLengthMode(e.target.value as "short" | "medium" | "long")
                            }
                            disabled={blogLoading}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="short">Kort (400+ woorden)</option>
                            <option value="medium">Middel (800+ woorden)</option>
                            <option value="long">Lang (1200+ woorden)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                            Soort post (optioneel)
                          </label>
                          <select
                            value={blogPostType}
                            onChange={(e) =>
                              setBlogPostType(e.target.value as "TOFU" | "MOFU" | "BOFU" | "")
                            }
                            disabled={blogLoading}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Geen</option>
                            <option value="TOFU">TOFU (Top of Funnel)</option>
                            <option value="MOFU">MOFU (Middle of Funnel)</option>
                            <option value="BOFU">BOFU (Bottom of Funnel)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                            Funnel fase (optioneel)
                          </label>
                          <input
                            type="text"
                            value={blogFunnelPhase}
                            onChange={(e) => setBlogFunnelPhase(e.target.value)}
                            disabled={blogLoading}
                            placeholder="Bijv. Awareness, Consideration..."
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="flex items-end justify-end gap-4">
                        <Button
                          onClick={handleGenerateBlog}
                          disabled={blogLoading || blogThought.trim().length < 10}
                          variant="primary"
                          size="md"
                        >
                          {blogLoading ? "Genereren..." : "Werk uit"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {blogContent && (
                    <div className="mt-6 pt-6 border-t border-zinc-200">
                      <h3 className="text-sm font-medium text-zinc-900 mb-3">
                        Gegenereerd artikel
                      </h3>
                      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <div className="whitespace-pre-wrap text-sm text-zinc-900 leading-relaxed">
                          {blogContent}
                        </div>
                      </div>
                      {blogOutputId && (
                        <OutputFeedback
                          outputId={blogOutputId}
                          onSubmitted={(r) =>
                            setBlogProfileVersion(r.newProfileVersion)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content Bank Mode */}
          {activeMode === "content-bank" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-medium text-zinc-900 mb-2">
                  Content Bank
                </h2>
                <p className="text-sm text-zinc-600 mb-4">
                  Jouw ideeën en bronnen op één plek
                </p>
                
                {/* Sub-tabs voor filters */}
                <div className="mb-6">
                  <Tabs
                    tabs={[
                      { id: "favorites", label: "Favorieten" },
                      { id: "all", label: "Alle ideeën" },
                      { id: "sources", label: "Bronnen" },
                    ]}
                    activeTab={contentBankFilter}
                    onTabChange={(tabId) =>
                      setContentBankFilter(tabId as "favorites" | "all" | "sources")
                    }
                  />
                </div>

                {/* Search and filters */}
                <div className="mb-6 space-y-4">
                  <Input
                    label="Zoek ideeën"
                    value={contentBankSearch}
                    onChange={(e) => setContentBankSearch(e.target.value)}
                    placeholder="Zoek in content..."
                    className="w-full"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                        Soort post
                      </label>
                      <select
                        value={contentBankPostType}
                        onChange={(e) =>
                          setContentBankPostType(e.target.value as "TOFU" | "MOFU" | "BOFU" | "")
                        }
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400"
                      >
                        <option value="">Alle soorten</option>
                        <option value="TOFU">TOFU (Top of Funnel)</option>
                        <option value="MOFU">MOFU (Middle of Funnel)</option>
                        <option value="BOFU">BOFU (Bottom of Funnel)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                        Funnel fase
                      </label>
                      <input
                        type="text"
                        value={contentBankFunnelPhase}
                        onChange={(e) => setContentBankFunnelPhase(e.target.value)}
                        placeholder="Bijv. Awareness, Consideration..."
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-0 focus:border-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                {contentBankError && (
                  <div className="mb-4 p-3 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
                    {contentBankError}
                  </div>
                )}

                {/* Outputs list */}
                {contentBankLoading ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-600">Laden...</p>
                  </div>
                ) : outputs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-600 mb-2">
                      Geen ideeën gevonden.
                    </p>
                    <p className="text-sm text-zinc-500">
                      {contentBankSearch
                        ? "Probeer een andere zoekterm"
                        : "Genereer je eerste content via Brainstorm of Thought to Post"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outputs.map((output) => (
                      <div
                        key={output.id}
                        className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-zinc-500 uppercase">
                                {output.channel}
                              </span>
                              <span className="text-xs text-zinc-400">•</span>
                              <span className="text-xs text-zinc-500">
                                {new Date(output.createdAt).toLocaleDateString("nl-NL")}
                              </span>
                              {output.inputJson?.isFavorite && (
                                <>
                                  <span className="text-xs text-zinc-400">•</span>
                                  <span className="text-xs text-zinc-500">⭐ Favoriet</span>
                                </>
                              )}
                            </div>
                            <div className="mb-2">
                              {output.inputJson?.thought && (
                                <p className="text-xs text-zinc-600 mb-1">
                                  <span className="font-medium">Thought:</span>{" "}
                                  {output.inputJson.thought}
                                </p>
                              )}
                            </div>
                            <div className="p-3 bg-white border border-zinc-200 rounded-lg">
                              <p className="text-sm text-zinc-900 leading-relaxed whitespace-pre-wrap">
                                {output.content}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFavorite(output.id)}
                              title={
                                output.inputJson?.isFavorite
                                  ? "Verwijder uit favorieten"
                                  : "Voeg toe aan favorieten"
                              }
                            >
                              {output.inputJson?.isFavorite ? "⭐" : "☆"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUseOutput(output)}
                            >
                              Gebruik
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOutput(output.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Verwijder
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
