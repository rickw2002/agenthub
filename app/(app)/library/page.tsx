"use client";

import { useState, useEffect, useRef } from "react";

interface Document {
  id: string;
  title: string;
  fileUrl: string;
  status: string;
  error: string | null;
  scope: string;
  projectId: string | null;
  createdAt: string;
  chunkCount: number;
}

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/library/documents");
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Upload document
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("scope", "GLOBAL");

      const uploadResponse = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload document");
      }

      const uploadData = await uploadResponse.json();
      const documentId = uploadData.documentId;

      // Refresh documents list to show new document
      await fetchDocuments();

      // Simulate processing (in real app, this would be async via webhook or polling)
      // For now, we'll process immediately with a placeholder text extraction
      setProcessing((prev) => new Set(prev).add(documentId));

      // Process document (extract text and create chunks)
      // In a real implementation, you'd extract text from the file
      // For now, using a placeholder
      const processResponse = await fetch("/api/documents/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          text: `Placeholder extracted text from ${file.name}. In a real implementation, this would be extracted from the actual file content.`,
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Failed to process document");
      }

      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });

      // Refresh to show updated status
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
      setProcessing((prev) => new Set(prev));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Weet je zeker dat je dit document wilt verwijderen?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const handleReprocess = async (documentId: string) => {
    try {
      setError(null);
      setProcessing((prev) => new Set(prev).add(documentId));

      // Call process endpoint with placeholder text (actual text extraction should happen server-side)
      // For minimal implementation, we use a placeholder that indicates reprocessing
      const response = await fetch("/api/documents/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          text: "[REPROCESS]",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reprocess document");
      }

      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });

      // Refresh to show updated status
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reprocess document");
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string, error: string | null, isProcessing: boolean) => {
    if (isProcessing) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
          Processing...
        </span>
      );
    }

    switch (status) {
      case "uploaded":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
            Uploaded
          </span>
        );
      case "processing":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
            Processing
          </span>
        );
      case "ready":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
            Ready
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Library</h1>
        <p className="text-gray-600">Loading documents...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library</h1>
          <p className="text-gray-600 mt-1">
            Global documents available to all projects in your organization
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.md"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No documents in library yet.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chunks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => {
                const isProcessing = processing.has(doc.id);
                return (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                      {doc.error && (
                        <div className="text-xs text-red-600 mt-1">{doc.error}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status, doc.error, isProcessing)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.chunkCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {doc.status === "failed" && (
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            disabled={isProcessing}
                            className="text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "Processing..." : "Reprocess"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
