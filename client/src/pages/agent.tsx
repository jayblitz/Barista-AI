import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, Users, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { BaristaAvatar } from "@/components/barista/BaristaAvatar";

interface SupportThread {
  id: string;
  userAddress: string;
  status: 'pending' | 'active' | 'resolved';
  createdAt: string;
  messages: SupportMessage[];
}

interface SupportMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

const ALLOWED_AGENT_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
];

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string>("");
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const storedAddress = localStorage.getItem("agentWalletAddress");
    if (storedAddress) {
      setAgentAddress(storedAddress);
      setIsAuthenticated(true);
      fetchThreads(storedAddress);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && agentAddress) {
      pollingRef.current = setInterval(() => {
        fetchThreads(agentAddress);
        if (activeThread) {
          fetchThread(activeThread.id);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isAuthenticated, agentAddress, activeThread?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages]);

  const fetchThreads = async (address: string) => {
    try {
      const res = await fetch("/api/support/threads", {
        headers: { "X-Agent-Address": address },
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (error) {
      console.error("Fetch threads error:", error);
    }
  };

  const fetchThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/support/threads/${threadId}`, {
        headers: { "X-Agent-Address": agentAddress },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveThread(data);
      }
    } catch (error) {
      console.error("Fetch thread error:", error);
    }
  };

  const handleConnect = () => {
    const inputAddress = prompt("Enter your wallet address to authenticate:");
    if (inputAddress) {
      localStorage.setItem("agentWalletAddress", inputAddress);
      setAgentAddress(inputAddress);
      setIsAuthenticated(true);
      fetchThreads(inputAddress);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("agentWalletAddress");
    setAgentAddress("");
    setIsAuthenticated(false);
    setThreads([]);
    setActiveThread(null);
  };

  const sendReply = async () => {
    if (!activeThread || !input.trim()) return;

    const content = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/support/threads/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "agent",
          senderAddress: agentAddress,
          content,
        }),
      });

      if (res.ok) {
        fetchThread(activeThread.id);
      }
    } catch (error) {
      console.error("Send reply error:", error);
    }
  };

  const resolveThread = async () => {
    if (!activeThread) return;

    try {
      await fetch(`/api/support/threads/${activeThread.id}/resolve`, {
        method: "POST",
        headers: { "X-Agent-Address": agentAddress },
      });
      fetchThreads(agentAddress);
      setActiveThread(null);
    } catch (error) {
      console.error("Resolve thread error:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'active': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case 'active': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Active</Badge>;
      case 'resolved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Resolved</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <BaristaAvatar size="lg" animate />
          <h1 className="text-2xl font-bold mt-6 text-foreground">Agent Dashboard</h1>
          <p className="text-muted-foreground mt-2 mb-6">
            Connect your wallet to access the support dashboard
          </p>
          <Button onClick={handleConnect} size="lg" className="w-full" data-testid="button-connect-agent">
            Connect Wallet
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")} 
            className="mt-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" data-testid="agent-dashboard">
      <aside className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Support Inbox
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate">{agentAddress.slice(0, 10)}...</span>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-xs h-6">
              Disconnect
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No support threads yet
            </div>
          ) : (
            threads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => fetchThread(thread.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all hover-elevate ${
                  activeThread?.id === thread.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted/50'
                }`}
                data-testid={`thread-${thread.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {thread.userAddress.slice(2, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {thread.userAddress.slice(0, 8)}...
                      </span>
                      {getStatusBadge(thread.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {thread.messages[thread.messages.length - 1]?.content || 'New thread'}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeThread ? (
          <>
            <header className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                  {activeThread.userAddress.slice(2, 4)}
                </div>
                <div>
                  <div className="font-semibold">{activeThread.userAddress.slice(0, 12)}...</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {getStatusIcon(activeThread.status)}
                    <span className="capitalize">{activeThread.status}</span>
                  </div>
                </div>
              </div>
              {activeThread.status !== 'resolved' && (
                <Button variant="outline" onClick={resolveThread} size="sm" data-testid="button-resolve">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              )}
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="agent-messages">
              <AnimatePresence mode="popLayout">
                {activeThread.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : message.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {message.sender === 'system' ? (
                      <div className="bg-muted/30 px-4 py-2 rounded-lg text-xs text-muted-foreground max-w-[80%]">
                        <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                          message.sender === 'agent'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card border border-border rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-[10px] opacity-60 mt-1 block">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {activeThread.status !== 'resolved' && (
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Reply to user..."
                    className="flex-1 rounded-full"
                    data-testid="input-agent-reply"
                  />
                  <Button
                    onClick={sendReply}
                    size="icon"
                    className="rounded-full"
                    disabled={!input.trim()}
                    data-testid="button-send-agent-reply"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Select a conversation to start helping</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
