"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadContext = async () => {
      try {
        setIsLoadingContext(true);
        const response = await fetch("/api/context");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Kon workspace context niet laden voor Copilot"
          );
        }

        setWorkspaceId(data.workspaceId);
      } catch (e) {
        console.error("[COPILOT] Context load error", e);
        setError(
          e instanceof Error
            ? e.message
            : "Kon workspace context niet laden voor Copilot"
        );
      } finally {
        setIsLoadingContext(false);
      }
    };

    loadContext();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || !workspaceId) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    // Voeg userbericht optimistisch toe
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/copilot/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolName: "get_context",
          workspaceId,
          payload: {
            message: userMessage,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Er is iets misgegaan bij het versturen van het bericht"
        );
      }

      const assistantText =
        typeof data.result === "string"
          ? data.result
          : "Context opgehaald. Volgende stap: gebruik deze informatie om een concrete actie te definiëren.";

      // Voeg assistant reply toe
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
        return [...withoutTemp, tempUserMessage, assistantMessage];
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is iets misgegaan met Copilot"
      );
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              Stel een vraag aan Copilot. Antwoorden zijn kort, in het Nederlands
              en gericht op concrete actie.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-500">Copilot is bezig...</p>
            </div>
          </div>
        )}
        {isLoadingContext && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-500">
                Workspace context wordt geladen...
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Beschrijf kort wat je nu wilt bereiken..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isLoading || isLoadingContext || !workspaceId}
        />
        <button
          type="submit"
          disabled={
            isLoading || isLoadingContext || !workspaceId || !inputValue.trim()
          }
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Versturen
        </button>
      </form>
    </div>
  );
}


