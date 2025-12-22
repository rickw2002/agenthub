"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface GA4Property {
  propertyId: string;
  displayName: string;
}

interface GA4PropertySelectorProps {
  workspaceId: string;
  userId: string;
  onSelect?: () => void; // Optional - component handles refresh internally
}

export default function GA4PropertySelector({
  workspaceId,
  userId,
}: GA4PropertySelectorProps) {
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const intelBaseUrl = process.env.NEXT_PUBLIC_INTEL_BASE_URL;
  const intelApiKey = process.env.NEXT_PUBLIC_INTEL_API_KEY || ""; // For MVP, might be empty

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // Use Next.js proxy route to add auth header server-side
        const response = await fetch(
          `/api/proxy/intel?path=/providers/ga4/properties&workspaceId=${workspaceId}&userId=${userId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }

        const data = await response.json();
        setProperties(data.properties || []);
        setSelectedPropertyId(data.selectedPropertyId);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load properties");
        setLoading(false);
      }
    };

    fetchProperties();
  }, [workspaceId, userId]);

  const handleSelect = async () => {
    if (!selectedPropertyId || !intelBaseUrl) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use Next.js proxy route to add auth header server-side
      const response = await fetch("/api/proxy/intel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "/providers/ga4/select-property",
          body: {
            tenant: {
              userId,
              workspaceId,
            },
            propertyId: selectedPropertyId,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to select property");
      }

      // Refresh page after successful selection
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select property");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-600">Loading properties...</p>
      </Card>
    );
  }

  if (error && properties.length === 0) {
    return (
      <Card className="p-4 border-yellow-200 bg-yellow-50">
        <p className="text-sm text-yellow-800">{error}</p>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="p-4 border-yellow-200 bg-yellow-50">
        <p className="text-sm text-yellow-800">
          No GA4 properties found. Please ensure your Google account has access to at least one GA4 property.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Select GA4 Property</h3>
      
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      <div className="space-y-2 mb-4">
        {properties.map((property) => (
          <label
            key={property.propertyId}
            className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
          >
            <input
              type="radio"
              name="property"
              value={property.propertyId}
              checked={selectedPropertyId === property.propertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">{property.displayName}</p>
              <p className="text-xs text-gray-500">ID: {property.propertyId}</p>
            </div>
          </label>
        ))}
      </div>

      <Button
        onClick={handleSelect}
        disabled={!selectedPropertyId || submitting}
        className="w-full"
      >
        {submitting ? "Selecting..." : "Select Property"}
      </Button>
    </Card>
  );
}

