"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Projects", href: "/projects" },
  { name: "Data Hub", href: "/data" },
  { name: "Agents", href: "/agents" },
  { name: "Workflows", href: "/workflows" },
  { name: "Library", href: "/library" },
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
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-primary">
                AgentHub
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
                        ? "border-primary text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        <Link
                          href="/projects"
                          onClick={() => setProjectDropdownOpen(false)}
                          className={`block px-4 py-2 text-sm ${
                            pathname === "/projects"
                              ? "bg-primary-50 text-primary font-medium"
                              : "text-gray-700 hover:bg-gray-100"
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
                                ? "bg-primary-50 text-primary font-medium"
                                : "text-gray-700 hover:bg-gray-100"
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
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
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
        <div className="sm:hidden">
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
                      ? "bg-primary-50 border-primary text-primary"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
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

