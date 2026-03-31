import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { chatWithGrok, streamChatWithGrok, isConfigured as isGrokConfigured } from "./services/grok";
import { queryKnowledge, healthCheck as ragHealthCheck, isConfigured as isRagConfigured, ensurePineconeIndex } from "./services/vectorStore";
import { getCachedResponse, setCachedResponse, healthCheck as cacheHealthCheck, isConfigured as isCacheConfigured } from "./services/cache";
import { startFundingMonitor, getFundingStatus } from "./services/fundingMonitor";
import { isConfigured as isMondayApiConfigured } from "./services/mondayApi";
import { parseOrderIntent, submitParsedOrderIntent, type ParsedOrderIntent } from "./services/mondayApi";
import { chatRequestSchema, feedbackSchema, type SuggestionPill, type ChatResponse } from "@shared/schema";

const SUGGESTIONS: SuggestionPill[] = [
  { text: "What is Monday Trade?" },
  { text: "Delta neutral strategy?" },
  { text: "Funding rate?" },
  { text: "Trading fees?" },
  { text: "Latest announcements" },
  { text: "Voyage Points?" },
  { text: "Max leverage?" },
  { text: "Supported wallets?" },
];

const ORDER_CONFIRMATION_WINDOW_MS = 2 * 60 * 1000;
const pendingOrderBySession = new Map<string, { intent: ParsedOrderIntent; createdAt: number }>();

function isConfirmMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === "confirm" || normalized === "yes" || normalized === "yes confirm";
}

function isCancelMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === "cancel" || normalized === "abort" || normalized === "never mind";
}

function pruneExpiredPendingOrders() {
  const now = Date.now();
  pendingOrderBySession.forEach((pending, sessionId) => {
    if (now - pending.createdAt > ORDER_CONFIRMATION_WINDOW_MS) {
      pendingOrderBySession.delete(sessionId);
    }
  });
}

function formatOrderPreview(intent: ParsedOrderIntent): string {
  const base = `${intent.type.toUpperCase()} ${intent.sideLabel} ${intent.size} ${intent.instrument} ${intent.leverage}x`;
  if (intent.type === "limit") {
    return `${base} at ${intent.price}`;
  }
  return base;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create the index in app initialization if credentials are available.
  void ensurePineconeIndex();
  
  app.get("/api/health", async (_req: Request, res: Response) => {
    const [cacheStatus, ragStatus] = await Promise.all([
      cacheHealthCheck(),
      ragHealthCheck(),
    ]);

    const fundingStatus = getFundingStatus();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        grok: isGrokConfigured() ? "configured" : "not_configured",
        rag: isRagConfigured() ? (ragStatus ? "connected" : "error") : "not_configured",
        cache: isCacheConfigured() ? (cacheStatus ? "connected" : "error") : "not_configured",
        mondayApi: isMondayApiConfigured() ? "configured" : "not_configured",
        fundingMonitor: fundingStatus.available ? "active" : (fundingStatus.configured ? "configured" : "not_configured"),
      },
    });
  });

  app.get("/api/funding/status", (_req: Request, res: Response) => {
    const status = getFundingStatus();
    res.json(status);
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

      pruneExpiredPendingOrders();

      const pendingOrder = pendingOrderBySession.get(currentSessionId);
      if (pendingOrder) {
        if (isConfirmMessage(message)) {
          pendingOrderBySession.delete(currentSessionId);
          const chatOrderResult = await submitParsedOrderIntent(pendingOrder.intent);
          const orderText = chatOrderResult.ok
            ? `${chatOrderResult.message}${chatOrderResult.txHash ? ` TxHash: ${chatOrderResult.txHash}` : ""}`
            : `${chatOrderResult.message}${chatOrderResult.errorCode ? ` (code: ${chatOrderResult.errorCode})` : ""}${chatOrderResult.requestId ? ` [requestId: ${chatOrderResult.requestId}]` : ""}`;
          const response: ChatResponse = {
            response: orderText,
            citations: [],
            toolsUsed: chatOrderResult.ok ? { monday_order: 1 } : { monday_order_error: 1 },
            sessionId: currentSessionId,
          };
          res.json(response);
          return;
        }

        if (isCancelMessage(message)) {
          pendingOrderBySession.delete(currentSessionId);
          res.json({
            response: "Pending order canceled. Send a new order instruction anytime.",
            citations: [],
            toolsUsed: { monday_order: 1 },
            sessionId: currentSessionId,
          } satisfies ChatResponse);
          return;
        }

        res.json({
          response: 'You have a pending order preview. Reply "CONFIRM" to place it or "CANCEL" to discard it.',
          citations: [],
          toolsUsed: { monday_order: 1 },
          sessionId: currentSessionId,
        } satisfies ChatResponse);
        return;
      }

      const parsedIntent = parseOrderIntent(message);
      if (parsedIntent) {
        pendingOrderBySession.set(currentSessionId, {
          intent: parsedIntent,
          createdAt: Date.now(),
        });

        const preview = formatOrderPreview(parsedIntent);
        res.json({
          response: `Order preview: ${preview}. Reply "CONFIRM" within 2 minutes to place this order, or "CANCEL" to discard it.`,
          citations: [],
          toolsUsed: { monday_order: 1 },
          sessionId: currentSessionId,
        } satisfies ChatResponse);
        return;
      }

      if (isConfirmMessage(message)) {
        const response: ChatResponse = {
          response: 'No pending order found. Send an order instruction first, e.g. "Long 0.001 BTC 10x".',
          citations: [],
          toolsUsed: { monday_order_error: 1 },
          sessionId: currentSessionId,
        };
        res.json(response);
        return;
      }

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

  startFundingMonitor();

  return httpServer;
}
