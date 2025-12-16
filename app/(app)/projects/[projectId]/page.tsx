"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

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

type Tab = "chat" | "documents";

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

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sourcesJson: string | null;
  metaJson: string | null;
  createdAt: string;
}

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === "documents") {
      fetchDocuments();
    }
  }, [projectId, activeTab]);

  useEffect(() => {
    if (projectId && activeTab === "chat") {
      fetchChats();
    }
  }, [projectId, activeTab]);

  useEffect(() => {
    if (currentChatId && projectId) {
      fetchMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project");
      }
      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/documents`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setDocumentsLoading(false);
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
      formData.append("scope", "PROJECT");
      formData.append("projectId", projectId);

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

      // Simulate processing
      setProcessing((prev) => new Set(prev).add(documentId));

      // Process document (extract text and create chunks)
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

  const fetchChats = async () => {
    try {
      setChatLoading(true);
      const response = await fetch(`/api/projects/${projectId}/chats`);
      if (!response.ok) {
        throw new Error("Failed to fetch chats");
      }
      const data = await response.json();
      setChats(data.chats || []);
      
      // If there are chats but no current chat selected, select the first one
      if (data.chats && data.chats.length > 0 && !currentChatId) {
        setCurrentChatId(data.chats[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    const messageText = messageInput.trim();
    setMessageInput("");
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      
      // Update current chat ID if a new chat was created
      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId);
      }
      
      // Update messages with the response
      setMessages(data.messages || []);
      
      // Refresh chats list to update message counts
      await fetchChats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Loading project...</h1>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Project</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          {error || "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="text-gray-600 mt-1">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "documents"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Documents
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "chat" && (
          <div className="flex flex-col h-[600px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                {error}
              </div>
            )}

            {chatLoading ? (
              <p className="text-gray-600">Loading chats...</p>
            ) : (
              <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {currentChatId
                          ? "Start een gesprek door een bericht te sturen."
                          : "Selecteer een chat of stuur een bericht om een nieuwe chat te starten."}
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.role === "USER" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === "USER"
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            
                            {msg.role === "ASSISTANT" && msg.sourcesJson && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                <div className="text-sm font-semibold mb-2">Uit bronnen:</div>
                                {(() => {
                                  try {
                                    const sources = JSON.parse(msg.sourcesJson);
                                    return (
                                      <div className="space-y-2">
                                        {sources.map((source: any, idx: number) => (
                                          <div key={idx} className="text-sm">
                                            <div className="mb-1">{source.text}</div>
                                            {source.citations && source.citations.length > 0 && (
                                              <div className="text-xs opacity-75">
                                                Bronnen: {source.citations.map((c: any) => `Doc ${c.docId}`).join(", ")}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                            
                            {msg.role === "ASSISTANT" && msg.metaJson && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                {(() => {
                                  try {
                                    const meta = JSON.parse(msg.metaJson);
                                    return (
                                      <>
                                        {meta.additional_reasoning && meta.additional_reasoning.length > 0 && (
                                          <div className="mb-3">
                                            <div className="text-sm font-semibold mb-2">Aanvullend:</div>
                                            <div className="space-y-1">
                                              {meta.additional_reasoning.map((item: any, idx: number) => (
                                                <div key={idx} className="text-sm opacity-90">
                                                  {item.text || item}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {meta.missing_info_questions && meta.missing_info_questions.length > 0 && (
                                          <div>
                                            <div className="text-sm font-semibold mb-2">Mogelijke vragen:</div>
                                            <ul className="list-disc list-inside space-y-1">
                                              {meta.missing_info_questions.map((q: string, idx: number) => (
                                                <li key={idx} className="text-sm opacity-90">
                                                  {q}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type je bericht..."
                      disabled={sending}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !messageInput.trim()}
                      className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sending ? "Verzenden..." : "Verstuur"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
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

            {documentsLoading ? (
              <p className="text-gray-600">Loading documents...</p>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No documents for this project yet.</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
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
        )}
      </div>
    </div>
  );
}

