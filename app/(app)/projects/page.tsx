"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const data = await response.json();
      setShowCreateForm(false);
      setNewProjectName("");
      setNewProjectDescription("");
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-zinc-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Projects</h1>
          <p className="text-sm text-zinc-600">
            Manage your projects and organize your work
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)} variant="primary" size="md">
            Create Project
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <div className="p-4 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl">
            {error}
          </div>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <h2 className="text-base font-medium text-zinc-900 mb-4">
            Create New Project
          </h2>
          <form onSubmit={handleCreateProject}>
            <div className="space-y-4">
              <Input
                label="Project Name *"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />
              <Textarea
                label="Description (optional)"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                placeholder="Enter project description"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectName("");
                  setNewProjectDescription("");
                }}
                variant="default"
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !newProjectName.trim()}
                variant="primary"
                size="md"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <p className="text-zinc-600 mb-4">No projects yet.</p>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
                size="md"
              >
                Create your first project
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow">
                <h3 className="text-base font-medium text-zinc-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  {project.settings?.useGlobalLibrary && (
                    <Badge variant="subtle">Global Library</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
