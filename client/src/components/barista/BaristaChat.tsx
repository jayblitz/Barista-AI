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

const ESCALATION_KEYWORDS = [
  "human", "support", "help me", "real person", "agent", "talk to someone",
  "speak to someone", "live chat", "customer service", "representative"
];

function shouldEscalate(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return ESCALATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

export function BaristaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [toolInUse, setToolInUse] = useState<"web_search" | "x_search" | "thinking" | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLiveSupport, setIsLiveSupport] = useState(false);
  const [supportThreadId, setSupportThreadId] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");

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
        content: "Oops! Something went wrong while brewing your answer. Please try again!",
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
    
    // Check if user wants to escalate to human support
    if (shouldEscalate(content)) {
      // Add system message about escalation
      const escalationMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'd be happy to connect you with our support team! Click the \"Talk to Human\" button below to start a live chat.",
        feedback: null,
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, escalationMessage]);
      return;
    }
    
    chatMutation.mutate({ message: content, currentMessages: updatedMessages });
  }, [chatMutation, messages]);

  const handleEscalate = useCallback(async () => {
    // Generate a simple user address for now (in production, use wallet connect)
    const tempAddress = userAddress || `0x${crypto.randomUUID().replace(/-/g, '').slice(0, 40)}`;
    setUserAddress(tempAddress);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: tempAddress,
          message: "User requested live support",
          chatHistory,
        }),
      });

      if (res.ok) {
        const thread = await res.json();
        setSupportThreadId(thread.id);
        setIsLiveSupport(true);
      }
    } catch (error) {
      console.error("Escalation error:", error);
    }
  }, [messages, userAddress]);

  const handleBackToAI = useCallback(() => {
    setIsLiveSupport(false);
  }, []);

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
        onEscalate={handleEscalate}
        isLiveSupport={isLiveSupport}
        supportThreadId={supportThreadId}
        userAddress={userAddress}
        onBackToAI={handleBackToAI}
        onFeedback={handleFeedback}
        isLoading={chatMutation.isPending}
        toolInUse={toolInUse}
      />
    </>
  );
}
