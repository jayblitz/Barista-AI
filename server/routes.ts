import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { chatWithGrok, streamChatWithGrok, isConfigured as isGrokConfigured } from "./services/grok";
import { queryKnowledge, healthCheck as ragHealthCheck, isConfigured as isRagConfigured } from "./services/vectorStore";
import { getCachedResponse, setCachedResponse, healthCheck as cacheHealthCheck, isConfigured as isCacheConfigured } from "./services/cache";
import { chatRequestSchema, feedbackSchema, type SuggestionPill, type ChatResponse } from "@shared/schema";
import { createSupportThread, getThread, getAllThreads, addMessage, resolveThread, SUPPORT_WALLET_ADDRESS } from "./services/support";
import { isConfigured as isEmailConfigured } from "./services/email";

const SUGGESTIONS: SuggestionPill[] = [
  { text: "What is Monday Trade?" },
  { text: "Do I need an invite code?" },
  { text: "Trading fees?" },
  { text: "Latest announcements" },
  { text: "How to set stop loss?" },
  { text: "Voyage Points?" },
  { text: "Max leverage?" },
  { text: "Supported wallets?" },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/health", async (_req: Request, res: Response) => {
    const [cacheStatus, ragStatus] = await Promise.all([
      cacheHealthCheck(),
      ragHealthCheck(),
    ]);

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        grok: isGrokConfigured() ? "configured" : "not_configured",
        rag: isRagConfigured() ? (ragStatus ? "connected" : "error") : "not_configured",
        cache: isCacheConfigured() ? (cacheStatus ? "connected" : "error") : "not_configured",
      },
    });
  });

  app.get("/api/chat/suggestions", (_req: Request, res: Response) => {
    res.json(SUGGESTIONS);
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.issues 
        });
        return;
      }

      const { message, history, sessionId } = parseResult.data;
      const currentSessionId = sessionId || randomUUID();

      const cachedResponse = await getCachedResponse(message);
      if (cachedResponse && history.length === 0) {
        const response: ChatResponse = {
          response: cachedResponse,
          citations: [],
          toolsUsed: { rag: 1 },
          sessionId: currentSessionId,
        };
        res.json(response);
        return;
      }

      const ragContext = await queryKnowledge(message);

      const grokResponse = await chatWithGrok(message, history, ragContext || undefined);

      if (history.length === 0) {
        await setCachedResponse(message, grokResponse.content);
      }

      const response: ChatResponse = {
        response: grokResponse.content,
        citations: grokResponse.citations,
        toolsUsed: {
          ...grokResponse.toolsUsed,
          rag: ragContext ? 1 : 0,
        },
        sessionId: currentSessionId,
      };

      res.json(response);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process chat request",
        response: "I'm having trouble brewing your answer right now. Please try again in a moment!",
        citations: [],
        toolsUsed: {},
        sessionId: randomUUID(),
      });
    }
  });

  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.issues 
        });
        return;
      }

      const { message, history, sessionId } = parseResult.data;
      const currentSessionId = sessionId || randomUUID();

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      res.write(`data: ${JSON.stringify({ type: "session", sessionId: currentSessionId })}\n\n`);

      const ragContext = await queryKnowledge(message);
      
      if (ragContext) {
        res.write(`data: ${JSON.stringify({ type: "tool", tool: "rag" })}\n\n`);
      }

      let fullResponse = "";

      await streamChatWithGrok(
        message,
        history,
        ragContext || undefined,
        (chunk) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ 
        type: "done", 
        toolsUsed: { rag: ragContext ? 1 : 0 },
        citations: []
      })}\n\n`);

      if (history.length === 0) {
        await setCachedResponse(message, fullResponse);
      }

      res.end();
    } catch (error) {
      console.error("Stream error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: "Stream failed" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/chat/feedback", async (req: Request, res: Response) => {
    try {
      const parseResult = feedbackSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.issues 
        });
        return;
      }

      const { messageId, feedback } = parseResult.data;
      
      console.log(`Feedback received: ${messageId} - ${feedback}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  // ===== SUPPORT ROUTES =====

  // Get support wallet address for client-side verification
  app.get("/api/support/config", (_req: Request, res: Response) => {
    res.json({
      supportWalletAddress: SUPPORT_WALLET_ADDRESS,
      emailConfigured: isEmailConfigured(),
    });
  });

  // Create a new support thread (user escalation)
  app.post("/api/support/threads", async (req: Request, res: Response) => {
    try {
      const { userAddress, message, chatHistory } = req.body;
      
      if (!userAddress || !message) {
        res.status(400).json({ error: "userAddress and message are required" });
        return;
      }

      const thread = await createSupportThread(userAddress, message, chatHistory);
      res.json(thread);
    } catch (error) {
      console.error("Create thread error:", error);
      res.status(500).json({ error: "Failed to create support thread" });
    }
  });

  // Get all threads (agent dashboard)
  app.get("/api/support/threads", (req: Request, res: Response) => {
    const agentAddress = req.headers["x-agent-address"] as string;
    
    if (!agentAddress) {
      res.status(401).json({ error: "Agent address required" });
      return;
    }

    // Validate agent is authorized
    if (agentAddress.toLowerCase() !== SUPPORT_WALLET_ADDRESS.toLowerCase()) {
      res.status(403).json({ error: "Unauthorized agent address" });
      return;
    }

    const threads = getAllThreads();
    res.json(threads);
  });

  // Get a specific thread - requires either user address or agent address
  app.get("/api/support/threads/:threadId", (req: Request, res: Response) => {
    const agentAddress = req.headers["x-agent-address"] as string;
    const userAddress = req.headers["x-user-address"] as string;
    
    const thread = getThread(req.params.threadId);
    
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    // Validate access - either authorized agent or thread owner
    const isAuthorizedAgent = agentAddress && agentAddress.toLowerCase() === SUPPORT_WALLET_ADDRESS.toLowerCase();
    const isThreadOwner = userAddress && userAddress.toLowerCase() === thread.userAddress.toLowerCase();
    
    if (!isAuthorizedAgent && !isThreadOwner) {
      res.status(403).json({ error: "Unauthorized access to thread" });
      return;
    }

    res.json(thread);
  });

  // Add message to thread
  app.post("/api/support/threads/:threadId/messages", (req: Request, res: Response) => {
    const { sender, senderAddress, content } = req.body;
    
    if (!sender || !senderAddress || !content) {
      res.status(400).json({ error: "sender, senderAddress, and content are required" });
      return;
    }

    // Validate agent is authorized if sender is "agent"
    if (sender === "agent" && senderAddress.toLowerCase() !== SUPPORT_WALLET_ADDRESS.toLowerCase()) {
      res.status(403).json({ error: "Unauthorized agent address" });
      return;
    }

    const message = addMessage(req.params.threadId, sender, senderAddress, content);
    
    if (!message) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    res.json(message);
  });

  // Resolve a thread
  app.post("/api/support/threads/:threadId/resolve", (req: Request, res: Response) => {
    const agentAddress = req.headers["x-agent-address"] as string;
    
    // Validate agent is authorized
    if (!agentAddress || agentAddress.toLowerCase() !== SUPPORT_WALLET_ADDRESS.toLowerCase()) {
      res.status(403).json({ error: "Unauthorized agent address" });
      return;
    }

    const success = resolveThread(req.params.threadId);
    
    if (!success) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    res.json({ success: true });
  });

  return httpServer;
}
