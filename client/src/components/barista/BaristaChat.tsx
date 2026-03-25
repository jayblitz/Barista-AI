import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FloatingChatBubble } from "./FloatingChatBubble";
import { ChatWindow } from "./ChatWindow";
import type { UIMessage, ChatResponse, SuggestionPill, MessageHistory } from "@shared/schema";

const DEFAULT_SUGGESTIONS: SuggestionPill[] = [
  { text: "What is Monday Trade?" },
  { text: "Do I need an invite code?" },
  { text: "Trading fees?" },
  { text: "Latest announcements" },
  { text: "How to set stop loss?" },
  { text: "Voyage Points?" },
  { text: "Max leverage?" },
  { text: "Supported wallets?" },
];

const DISCORD_URL = "https://discord.com/invite/mondaytrade";

const HUMAN_SUPPORT_KEYWORDS = [
  "human", "real person", "agent", "talk to someone", "speak to someone",
  "live chat", "customer service", "representative", "live support",
  "contact support", "need help", "speak with",
];

function wantsHumanSupport(message: string): boolean {
  const lower = message.toLowerCase();
  return HUMAN_SUPPORT_KEYWORDS.some(keyword => lower.includes(keyword));
}

export function BaristaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [toolInUse, setToolInUse] = useState<"web_search" | "x_search" | "thinking" | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const { data: suggestions = DEFAULT_SUGGESTIONS } = useQuery<SuggestionPill[]>({
    queryKey: ["/api/chat/suggestions"],
    staleTime: 1000 * 60 * 60,
  });

  const chatMutation = useMutation({
    mutationFn: async ({ message, currentMessages }: { message: string; currentMessages: UIMessage[] }) => {
      const history: MessageHistory[] = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setToolInUse("thinking");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, sessionId }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      setToolInUse(null);
      setSessionId(data.sessionId);
      
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        citations: data.citations,
        toolsUsed: data.toolsUsed,
        feedback: null,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      setToolInUse(null);
      console.error("Chat error:", error);
      
      const errorMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Something went wrong. Please try again or visit docs.monday.trade for help.",
        feedback: null,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    if (wantsHumanSupport(content)) {
      const discordMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `For human support, join the Monday Trade Discord community at ${DISCORD_URL} — the team and community members respond there quickly.`,
        feedback: null,
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, discordMessage]);
      return;
    }
    
    chatMutation.mutate({ message: content, currentMessages: updatedMessages });
  }, [chatMutation, messages]);

  const handleFeedback = useCallback((messageId: string, feedback: "positive" | "negative") => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m
      )
    );
    
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, feedback }),
    }).catch(console.error);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <FloatingChatBubble isOpen={isOpen} onClick={toggleChat} />
      <ChatWindow
        isOpen={isOpen}
        onClose={toggleChat}
        messages={messages}
        suggestions={suggestions}
        onSendMessage={handleSendMessage}
        onFeedback={handleFeedback}
        isLoading={chatMutation.isPending}
        toolInUse={toolInUse}
      />
    </>
  );
}
