\"use client\";

import { useState, useRef, useEffect } from \"react\";

interface Message {
  id: string;
  role: \"user\" | \"assistant\";
  content: string;
  createdAt: string;
}

interface MasterChatProps {
  mode?: \"master\" | \"copilot\";
}

export default function MasterChat({ mode = \"master\" }: MasterChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(\"\");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCopilot = mode === \"copilot\";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: \"smooth\" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Laad WorkspaceContext voor Copilot-modus
  useEffect(() => {
    if (!isCopilot) return;

    const loadContext = async () => {
      try {
        setIsLoadingContext(true);
        const response = await fetch(\"/api/context\");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || \"Kon workspace context niet laden voor Copilot\"
          );
        }

        setWorkspaceId(data.workspaceId);
      } catch (e) {
        console.error(\"[MASTERCHAT][COPILOT] Context load error\", e);
        setError(
          e instanceof Error
            ? e.message
            : \"Kon workspace context niet laden voor Copilot\"
        );
      } finally {
        setIsLoadingContext(false);
      }
    };

    loadContext();
  }, [isCopilot]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) {
      return;
    }

    if (isCopilot && !workspaceId) {
      setError(\"Workspace context nog niet geladen\");
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue(\"\");
    setError(null);

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: \"user\",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      let assistantText = \"\";

      if (!isCopilot) {
        const response = await fetch(\"/api/chat\", {
          method: \"POST\",
          headers: {
            \"Content-Type\": \"application/json\",
          },
          body: JSON.stringify({
            scope: \"MASTER\",
            message: userMessage,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              \"Er is iets misgegaan bij het versturen van het bericht\"
          );
        }

        assistantText = data.reply;
      } else {
        const response = await fetch(\"/api/copilot/action\", {
          method: \"POST\",
          headers: {
            \"Content-Type\": \"application/json\",
          },
          body: JSON.stringify({
            toolName: \"get_context\",
            workspaceId,
            payload: {
              message: userMessage,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              \"Er is iets misgegaan bij het versturen van het bericht naar Copilot\"
          );
        }

        const result = data.result;
        try {
          const profile =
            result?.profileJson && typeof result.profileJson === \"string\"
              ? JSON.parse(result.profileJson)
              : {};
          const goals =
            result?.goalsJson && typeof result.goalsJson === \"string\"
              ? JSON.parse(result.goalsJson)
              : {};

          const rol = profile.rol || \"onbekende rol\";
          const branche = profile.branche || \"onbekende branche\";
          const hoofdDoel = goals.doelen || \"geen doelen ingevuld\";

          assistantText = `Ik gebruik je workspace-context (${rol} in ${branche}). Hoofddoel: ${hoofdDoel}. Volgende stap: formuleer één concrete taak die ik namens je mag uitvoeren.`;
        } catch {
          assistantText =
            \"Je workspace-context is geladen. Volgende stap: beschrijf één concrete actie die ik nu moet voorbereiden.\";
        }
      }

      // Add assistant reply
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: \"assistant\",
        content: assistantText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        // Replace temp user message if it exists, otherwise just add assistant
        const withoutTemp = prev.filter((m) => !m.id.startsWith(\"temp-\"));
        return [...withoutTemp, tempUserMessage, assistantMessage];
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : \"Er is iets misgegaan\"
      );
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith(\"temp-\")));
    } finally {
      setIsLoading(false);
    }
  };

  const placeholder = isCopilot
    ? \"Beschrijf kort wat je nu wilt bereiken...\"
    : \"Stel een vraag over je data...\";

  return (
    <div className=\"flex flex-col h-96\">
      {/* Messages Area */}
      <div className=\"flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4\">
        {messages.length === 0 ? (
          <div className=\"text-center py-8\">
            <p className=\"text-gray-500 text-sm\">
              {isCopilot
                ? \"Stel een vraag aan Copilot. Antwoorden zijn kort, in het Nederlands en gericht op concrete actie.\"
                : \"Stel een vraag over je data en ik help je verder!\"}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === \"user\" ? \"justify-end\" : \"justify-start\"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === \"user\"
                    ? \"bg-primary text-white\"
                    : \"bg-white border border-gray-200 text-gray-900\"
                }`}
              >
                <p className=\"text-sm whitespace-pre-wrap\">
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className=\"flex justify-start\">
            <div className=\"bg-white border border-gray-200 rounded-lg p-3\">
              <p className=\"text-sm text-gray-500\">
                {isCopilot ? \"Copilot is bezig...\" : \"Typen...\"}
              </p>
            </div>
          </div>
        )}
        {isCopilot && isLoadingContext && (
          <div className=\"flex justify-start\">
            <div className=\"bg-white border border-gray-200 rounded-lg p-3\">
              <p className=\"text-sm text-gray-500\">
                Workspace context wordt geladen...
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className=\"mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2\">
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className=\"mt-4 flex gap-2\">
        <input
          type=\"text\"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className=\"flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent\"
          disabled={isLoading || (isCopilot && (!workspaceId || isLoadingContext))}
        />
        <button
          type=\"submit\"
          disabled={
            isLoading ||
            !inputValue.trim() ||
            (isCopilot && (!workspaceId || isLoadingContext))
          }
          className=\"bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed\"
        >
          Versturen
        </button>
      </form>
    </div>
  );
}






