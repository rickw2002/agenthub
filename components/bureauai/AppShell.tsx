"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const sidebarItems = [
  { name: "Projects", href: "/projects" },
  { name: "Library", href: "/library" },
  { name: "Settings", href: "/account" },
];

export function AppShell({ children, title, description }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Topbar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-zinc-900">
                Bureau-AI
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-500">Status: Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {(title || description) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-zinc-900 mb-2">{title}</h1>}
              {description && <p className="text-zinc-600">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

