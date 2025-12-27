"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AgentTemplate } from "@prisma/client";

interface AgentsCatalogProps {
  agents: AgentTemplate[];
}

export default function AgentsCatalog({ agents }: AgentsCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Unieke categorieën en types ophalen
  const categories = useMemo(() => {
    const cats = new Set(agents.map((agent) => agent.category));
    return Array.from(cats).sort();
  }, [agents]);

  const types = useMemo(() => {
    const typeSet = new Set(agents.map((agent) => agent.type));
    return Array.from(typeSet).sort();
  }, [agents]);

  // Filter logica
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Zoekfilter
      const matchesSearch =
        searchQuery === "" ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === null || agent.category === selectedCategory;

      // Type filter
      const matchesType = selectedType === null || agent.type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [agents, searchQuery, selectedCategory, selectedType]);

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "advanced":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "sales":
        return "bg-purple-100 text-purple-800";
      case "marketing":
        return "bg-pink-100 text-pink-800";
      case "operations":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      {/* Zoekbalk en filters */}
      <div className="mb-6 space-y-4">
        {/* Zoekbalk */}
        <div>
          <input
            type="text"
            placeholder="Zoek op naam of beschrijving..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Category filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categorie:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === null
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Alle
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-2 flex-wrap ml-4">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedType === null
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Alle
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                  selectedType === type
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Resultaten teller */}
        <div className="text-sm text-gray-600">
          {filteredAgents.length} {filteredAgents.length === 1 ? "agent gevonden" : "agents gevonden"}
        </div>
      </div>

      {/* Agents grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Geen agents gevonden die voldoen aan je filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header met badges */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadgeColor(
                      agent.category
                    )}`}
                  >
                    {agent.category}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 capitalize">
                    {agent.type}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyBadgeColor(
                    agent.difficulty
                  )}`}
                >
                  {agent.difficulty === "beginner" ? "Beginner-friendly" : "Advanced"}
                </span>
              </div>

              {/* Titel */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>

              {/* Korte beschrijving */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{agent.shortDescription}</p>

              {/* Actie knop */}
              <Link
                href={`/agents/${agent.slug}`}
                className="inline-block w-full text-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                Bekijk details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}











