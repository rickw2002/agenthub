"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Projects", href: "/projects" },
  { name: "Bureau-AI", href: "/bureau-ai" },
  { name: "Data Hub", href: "/data" },
  { name: "Agents", href: "/agents" },
  { name: "Workflows", href: "/workflows" },
  { name: "Library", href: "/library" },
  { name: "Prompt Library", href: "/prompt-library" },
  { name: "Prompts", href: "/prompts" },
  { name: "Support", href: "/support" },
  { name: "Account", href: "/account" },
];

interface Project {
  id: string;
  name: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  return (
    <nav className="bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-zinc-900">
                Bureau-AI
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-zinc-900 text-zinc-900"
                        : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Project Switcher */}
            {!projectsLoading && projects.length > 0 && (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="inline-flex items-center px-3 py-2 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-0 focus:border-zinc-400"
                >
                  <span className="mr-2">Projects</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      projectDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {projectDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProjectDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-sm bg-white border border-zinc-200 z-20">
                      <div className="py-1">
                        <Link
                          href="/projects"
                          onClick={() => setProjectDropdownOpen(false)}
                          className={`block px-4 py-2 text-sm ${
                            pathname === "/projects"
                              ? "bg-zinc-100 text-zinc-900 font-medium"
                              : "text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          All Projects
                        </Link>
                        {projects.map((project) => (
                          <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            onClick={() => setProjectDropdownOpen(false)}
                            className={`block px-4 py-2 text-sm ${
                              pathname === `/projects/${project.id}`
                                ? "bg-zinc-100 text-zinc-900 font-medium"
                                : "text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            {project.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
            {/* Mobile menu button */}
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-xl text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-zinc-200">
          <div className="pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? "bg-zinc-100 border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pl-3 pr-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

