"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Projects</h1>
        <p className="text-gray-600">Loading projects...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Manage your projects and organize your work
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            Create Project
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Create New Project
          </h2>
          <form onSubmit={handleCreateProject}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Project Name *
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="projectDescription"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (optional)
                </label>
                <textarea
                  id="projectDescription"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter project description"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectName("");
                  setNewProjectDescription("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !newProjectName.trim()}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No projects yet.</p>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow block"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {project.settings?.useGlobalLibrary && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Global Library
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

