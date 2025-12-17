
"use client";

import { useMemo, useState } from "react";
import type { Prompt, PromptLevel } from "@/lib/prompt-library";
import { mockPrompts } from "@/lib/prompt-library-mock";

type CategoryFilterValue = "All" | string;
type LevelFilterValue = "All" | PromptLevel;

interface FilterState {
  category: CategoryFilterValue;
  useCases: string[];
  level: LevelFilterValue;
}

const MAX_USE_CASE_FILTERS = 2;

const DEFAULT_FILTER_STATE: FilterState = {
  category: "All",
  useCases: [],
  level: "All",
};

function getActiveFiltersDescription(filters: FilterState): string {
  const parts: string[] = [];

  if (filters.category !== "All") {
    parts.push(`Category: ${filters.category}`);
  }

  if (filters.useCases.length > 0) {
    parts.push(`Use cases: ${filters.useCases.join(", ")}`);
  }

  if (filters.level !== "All") {
    parts.push(`Level: ${filters.level}`);
  }

  if (parts.length === 0) {
    return "No filters applied";
  }

  return parts.join(" · ");
}

function filterPrompts(prompts: Prompt[], filters: FilterState): Prompt[] {
  return prompts.filter((prompt) => {
    if (filters.category !== "All" && prompt.category !== filters.category) {
      return false;
    }

    if (filters.useCases.length > 0) {
      const matchesAllSelectedUseCases = filters.useCases.every((useCase) =>
        prompt.useCases.includes(useCase)
      );

      if (!matchesAllSelectedUseCases) {
        return false;
      }
    }

    if (filters.level !== "All" && prompt.level !== filters.level) {
      return false;
    }

    return true;
  });
}

export default function PromptLibraryPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const categories = useMemo<CategoryFilterValue[]>(() => {
    const uniqueCategories = Array.from(new Set(mockPrompts.map((prompt) => prompt.category)));
    return ["All", ...uniqueCategories];
  }, []);

  const useCaseOptions = useMemo<string[]>(() => {
    const allUseCases = mockPrompts.flatMap((prompt) => prompt.useCases);
    return Array.from(new Set(allUseCases));
  }, []);

  const levelOptions: LevelFilterValue[] = ["All", "Beginner", "Intermediate", "Advanced"];

  const visiblePrompts = useMemo(
    () => filterPrompts(mockPrompts, filters),
    [filters]
  );

  const activeFiltersDescription = useMemo(
    () => getActiveFiltersDescription(filters),
    [filters]
  );

  const handleCategoryChange = (category: CategoryFilterValue) => {
    setFilters((prev) => ({
      ...prev,
      category,
    }));
  };

  const handleUseCaseToggle = (useCase: string) => {
    setFilters((prev) => {
      const isSelected = prev.useCases.includes(useCase);

      if (isSelected) {
        return {
          ...prev,
          useCases: prev.useCases.filter((value) => value !== useCase),
        };
      }

      if (prev.useCases.length >= MAX_USE_CASE_FILTERS) {
        return prev;
      }

      return {
        ...prev,
        useCases: [...prev.useCases, useCase],
      };
    });
  };

  const handleLevelChange = (level: LevelFilterValue) => {
    setFilters((prev) => ({
      ...prev,
      level,
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Prompt Library</h1>
          <p className="text-sm text-gray-600">
            {visiblePrompts.length} prompt{visiblePrompts.length === 1 ? "" : "s"} visible
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetFilters}
          className="text-sm text-gray-600 underline"
        >
          Reset filters
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = filters.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    isActive ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Use cases (max {MAX_USE_CASE_FILTERS})</p>
          <div className="flex flex-wrap gap-2">
            {useCaseOptions.map((useCase) => {
              const isActive = filters.useCases.includes(useCase);
              return (
                <button
                  key={useCase}
                  type="button"
                  onClick={() => handleUseCaseToggle(useCase)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    isActive ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700"
                  }`}
                >
                  {useCase}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Level</p>
          <div className="flex flex-wrap gap-2">
            {levelOptions.map((level) => {
              const isActive = filters.level === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleLevelChange(level)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    isActive ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Showing {visiblePrompts.length} prompt{visiblePrompts.length === 1 ? "" : "s"} ·{" "}
        {activeFiltersDescription}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visiblePrompts.map((prompt) => (
          <article
            key={prompt.id}
            className="border rounded-lg p-4 bg-white flex flex-col justify-between"
          >
            <div>
              <h2 className="text-base font-semibold mb-1">{prompt.title}</h2>
              <p className="text-sm text-gray-700 mb-2">{prompt.shortDescription}</p>
              <p className="text-xs text-gray-500 mb-1">Category: {prompt.category}</p>
              <p className="text-xs text-gray-500 mb-1">Level: {prompt.level}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {prompt.useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

