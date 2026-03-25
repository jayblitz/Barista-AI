import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { chatWithGrok, streamChatWithGrok, isConfigured as isGrokConfigured } from "./services/grok";
import { queryKnowledge, healthCheck as ragHealthCheck, isConfigured as isRagConfigured } from "./services/vectorStore";
import { getCachedResponse, setCachedResponse, healthCheck as cacheHealthCheck, isConfigured as isCacheConfigured } from "./services/cache";
import { chatRequestSchema, feedbackSchema, type SuggestionPill, type ChatResponse } from "@shared/schema";

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

      // Do not cache live search results — they are time-sensitive
      if (history.length === 0 && !grokResponse.toolsUsed.live_search) {
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
        response: "Something went wrong. Please try again or visit docs.monday.trade for help.",
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

      const streamResult = await streamChatWithGrok(
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
        toolsUsed: { ...streamResult.toolsUsed, rag: ragContext ? 1 : 0 },
        citations: streamResult.citations || []
      })}\n\n`);

      // Do not cache live search results — they are time-sensitive
      if (history.length === 0 && !streamResult.toolsUsed.live_search) {
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

  return httpServer;
}
