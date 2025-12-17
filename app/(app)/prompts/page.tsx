"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Prompt {
  id: string;
  title: string;
  body: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    tags: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/prompts");
      if (!response.ok) {
        throw new Error("Failed to fetch prompts");
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPrompt(null);
    setFormData({ title: "", body: "", tags: "" });
    setError(null);
    setShowForm(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      body: prompt.body,
      tags: prompt.tags,
    });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze prompt wilt verwijderen?")) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete prompt");
      }

      await fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete prompt");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : "/api/prompts";
      const method = editingPrompt ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save prompt");
      }

      setShowForm(false);
      setEditingPrompt(null);
      setFormData({ title: "", body: "", tags: "" });
      await fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Prompts</h1>
        <p className="text-gray-600">Loading prompts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompts</h1>
          <p className="text-gray-600 mt-1">
            Beheer prompts die gebruikt kunnen worden in n8n workflows
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors text-sm font-medium"
        >
          Nieuwe prompt
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPrompt ? "Prompt bewerken" : "Nieuwe prompt"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titel
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
                placeholder="Bijv. Customer Support Triage"
              />
            </div>
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                Prompt body
              </label>
              <textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                required
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent font-mono text-sm"
                placeholder="Je prompt tekst hier..."
              />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (komma-gescheiden)
              </label>
              <input
                id="tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
                placeholder="support, triage, email"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {submitting ? "Opslaan..." : "Opslaan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPrompt(null);
                  setFormData({ title: "", body: "", tags: "" });
                  setError(null);
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">Nog geen prompts aangemaakt.</p>
          <button
            onClick={handleCreate}
            className="bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors text-sm font-medium"
          >
            Maak je eerste prompt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 flex-1">{prompt.title}</h3>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(prompt)}
                    className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{prompt.body}</p>
              {prompt.tags && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {prompt.tags.split(",").map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400">
                {new Date(prompt.updatedAt).toLocaleDateString("nl-NL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

