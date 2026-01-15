import { useRef, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaristaAvatar } from "./BaristaAvatar";
import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { SuggestionPills } from "./SuggestionPill";
import { TypingIndicator } from "./TypingIndicator";
import type { UIMessage, SuggestionPill } from "@shared/schema";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  messages: UIMessage[];
  suggestions: SuggestionPill[];
  onSendMessage: (message: string) => void;
  onFeedback: (messageId: string, feedback: "positive" | "negative") => void;
  isLoading: boolean;
  toolInUse?: "web_search" | "x_search" | "thinking" | null;
}

export function ChatWindow({
  isOpen,
  onClose,
  messages,
  suggestions,
  onSendMessage,
  onFeedback,
  isLoading,
  toolInUse,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-24 right-6 w-96 h-[600px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          style={{
            boxShadow: "0 25px 50px -12px rgba(139, 90, 59, 0.25)",
          }}
          data-testid="chat-window"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-card" data-testid="chat-header">
            <div className="flex items-center gap-3">
              <BaristaAvatar size="md" />
              <div>
                <h2 className="text-base font-semibold text-card-foreground flex items-center gap-1.5" data-testid="chat-title">
                  Barista
                  <Sparkles className="w-4 h-4 text-primary" />
                </h2>
                <p className="text-xs text-muted-foreground" data-testid="chat-subtitle">Monday Trade Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
              aria-label="Close chat"
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="chat-empty-state">
                  <BaristaAvatar size="lg" animate={true} />
                  <h3 className="text-lg font-semibold mt-4 text-foreground" data-testid="empty-state-title">
                    Hey there!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[280px]" data-testid="empty-state-description">
                    I'm Barista, your Monday Trade assistant. Ask me anything about trading, fees, or how to get started!
                  </p>
                </div>
              )}
              
              {messages.map((message) => (
                <Message key={message.id} message={message} onFeedback={onFeedback} />
              ))}
              
              {isLoading && <TypingIndicator toolInUse={toolInUse} />}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-card" data-testid="chat-footer">
            {messages.length === 0 && (
              <div className="mb-3" data-testid="suggestions-container">
                <SuggestionPills
                  suggestions={suggestions}
                  onSelect={onSendMessage}
                  disabled={isLoading}
                />
              </div>
            )}
            <ChatInput onSend={onSendMessage} disabled={isLoading} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
