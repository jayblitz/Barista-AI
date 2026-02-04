import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SupportMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

interface LiveSupportChatProps {
  threadId: string;
  userAddress: string;
  onBack: () => void;
  initialMessages?: SupportMessage[];
}

export function LiveSupportChat({
  threadId,
  userAddress,
  onBack,
  initialMessages = [],
}: LiveSupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/threads/${threadId}`, {
          headers: { "X-User-Address": userAddress },
        });
        if (res.ok) {
          const thread = await res.json();
          setMessages(thread.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [threadId, userAddress]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/support/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "user",
          senderAddress: userAddress,
          content,
        }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, { ...message, timestamp: new Date(message.timestamp) }]);
      }
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
          data-testid="button-back-to-ai"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Live Support</h3>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        data-testid="live-chat-messages"
      >
        <AnimatePresence mode="popLayout">
          {messages.filter(m => m.sender !== 'system').map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: index === messages.length - 1 ? 0.05 : 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border rounded-bl-md'
                }`}
              >
                {message.sender === 'agent' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">Support Agent</span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                <span className="text-[10px] opacity-60 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              You're connected to live support.<br />
              A team member will respond shortly.
            </p>
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-card/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-background"
            data-testid="input-live-message"
          />
          <Button
            onClick={sendMessage}
            size="icon"
            className="rounded-full"
            disabled={!input.trim()}
            data-testid="button-send-live-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
