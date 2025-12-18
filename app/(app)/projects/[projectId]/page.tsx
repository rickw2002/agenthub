"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { OutputFeedback } from "@/components/bureauai/OutputFeedback";

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
  const [activeTab, setActiveTab] = useState<"chat" | "linkedin">("chat");

  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // LinkedIn generator state (Bureau-AI)
  const [thought, setThought] = useState("");
  const [lengthMode, setLengthMode] = useState<"short" | "medium" | "long">(
    "medium"
  );
  const [linkedinContent, setLinkedinContent] = useState<string | null>(null);
  const [linkedinOutputId, setLinkedinOutputId] = useState<string | null>(null);
  const [linkedinProfileVersion, setLinkedinProfileVersion] = useState<
    number | null
  >(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

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

  const handleGenerateLinkedin = async () => {
    if (!thought.trim() || linkedinLoading) return;

    setLinkedinLoading(true);
    setLinkedinError(null);
    setLinkedinContent(null);
    setLinkedinOutputId(null);

    try {
      const res = await fetch("/api/generate/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          thought: thought.trim(),
          length: lengthMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data?.message ||
          "Er is iets misgegaan bij het genereren van de LinkedIn-post.";
        const action = data?.action
          ? ` ${data.action}`
          : "";
        throw new Error(message + action);
      }

      setLinkedinContent(data.content ?? null);
      setLinkedinOutputId(data.outputId ?? null);
      // profile version komt pas terug via feedback; hier nog niet bekend
    } catch (err) {
      setLinkedinError(
        err instanceof Error
          ? err.message
          : "Er is iets misgegaan bij het genereren van de LinkedIn-post."
      );
    } finally {
      setLinkedinLoading(false);
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
        {linkedinProfileVersion != null && (
          <p className="text-xs text-gray-500 mt-1">
            Actieve profielversie: v{linkedinProfileVersion}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-medium pb-1 border-b-2 ${
              activeTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("linkedin")}
            className={`text-sm font-medium pb-1 border-b-2 ${
              activeTab === "linkedin"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            LinkedIn generator
          </button>
        </div>

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

        {activeTab === "linkedin" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              LinkedIn thought → post
            </h2>
            {linkedinError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {linkedinError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thought
                </label>
                <textarea
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  rows={4}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  placeholder="Vertel in je eigen woorden waar de post over moet gaan..."
                  disabled={linkedinLoading}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lengte
                  </label>
                  <select
                    value={lengthMode}
                    onChange={(e) =>
                      setLengthMode(e.target.value as "short" | "medium" | "long")
                    }
                    disabled={linkedinLoading}
                    className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="short">Kort</option>
                    <option value="medium">Middel</option>
                    <option value="long">Lang</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLinkedin}
                  disabled={linkedinLoading || thought.trim().length < 10}
                  className="ml-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {linkedinLoading ? "Genereren..." : "Generate LinkedIn post"}
                </button>
              </div>
            </div>

            {linkedinContent && (
              <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Gegenereerde post
                </h3>
                <div className="whitespace-pre-wrap text-sm text-gray-900 mb-2">
                  {linkedinContent}
                </div>
                {linkedinOutputId && (
                  <OutputFeedback
                    outputId={linkedinOutputId}
                    onSubmitted={(r) =>
                      setLinkedinProfileVersion(r.newProfileVersion)
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

