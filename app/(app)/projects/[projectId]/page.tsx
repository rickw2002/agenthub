"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/bureauai/AppShell";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { OutputFeedback } from "@/components/bureauai/OutputFeedback";

interface Project {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  settings: {
    id: string;
    useGlobalLibrary: boolean;
  } | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("linkedin");

  // LinkedIn generator state
  const [thought, setThought] = useState("");
  const [lengthMode, setLengthMode] = useState<"short" | "medium" | "long">("medium");
  const [linkedinContent, setLinkedinContent] = useState<string | null>(null);
  const [linkedinOutputId, setLinkedinOutputId] = useState<string | null>(null);
  const [linkedinProfileVersion, setLinkedinProfileVersion] = useState<number | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  // Blog generator state
  const [blogThought, setBlogThought] = useState("");
  const [blogLengthMode, setBlogLengthMode] = useState<"short" | "medium" | "long">("medium");
  const [blogContent, setBlogContent] = useState<string | null>(null);
  const [blogOutputId, setBlogOutputId] = useState<string | null>(null);
  const [blogProfileVersion, setBlogProfileVersion] = useState<number | null>(null);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project");
      }
      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

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
          projectId,
          thought: thought.trim(),
          length: lengthMode,
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
          projectId,
          thought: blogThought.trim(),
          length: blogLengthMode,
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

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-8 w-64 bg-zinc-200 rounded-xl animate-pulse" />
          <Card>
            <div className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <Card>
          <div className="p-4 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
            {error || "Project not found"}
          </div>
        </Card>
      </AppShell>
    );
  }

  const tabs = [
    { id: "linkedin", label: "LinkedIn" },
    { id: "blog", label: "Blog" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm text-zinc-600">{project.description}</p>
          )}
          {linkedinProfileVersion != null && (
            <p className="text-xs text-zinc-500 mt-2">
              Actieve profielversie: v{linkedinProfileVersion}
            </p>
          )}
        </div>

        {/* Main Content Card */}
        <Card>
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mt-6">
            {/* LinkedIn Tab */}
            {activeTab === "linkedin" && (
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
                        {linkedinLoading ? "Genereren..." : "Generate LinkedIn post"}
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

            {/* Blog Tab */}
            {activeTab === "blog" && (
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
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1 max-w-xs">
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
                      <Button
                        onClick={handleGenerateBlog}
                        disabled={blogLoading || blogThought.trim().length < 10}
                        variant="primary"
                        size="md"
                      >
                        {blogLoading ? "Genereren..." : "Generate blog artikel"}
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
        </Card>
      </div>
    </AppShell>
  );
}
