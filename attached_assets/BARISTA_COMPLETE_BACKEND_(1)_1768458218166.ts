// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║                    BARISTA AI - COMPLETE BACKEND CODE                        ║
// ║                                                                               ║
// ║  Instructions:                                                                ║
// ║  1. Copy each section to the corresponding file in your Replit               ║
// ║  2. Each section is marked with: ═══ FILE: path/to/file.ts ═══               ║
// ║  3. Create the file if it doesn't exist, or replace contents if it does      ║
// ║                                                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/services/grok.ts
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from "openai";

// Types
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GrokResponse {
  content: string;
  citations: string[];
  toolsUsed: Record<string, number>;
}

// System Prompt - NO hardcoded facts, instructs AI to search
const BARISTA_SYSTEM_PROMPT = `You are Barista ☕, the friendly AI assistant for Monday Trade - a spot and perpetuals DEX built on Monad.

## YOUR PERSONALITY
- Warm, helpful, and enthusiastic - like a friendly barista at a coffee shop
- Expert but approachable, never condescending
- Use emojis naturally: ☕ 🚀 ✨ 💜 📈 🎉 💰
- Keep responses concise (under 200 words unless detail is needed)
- Start with friendly openers: "Coming right up! ☕", "Great question!", "Perfect timing!"
- End with helpful closers: "Hope that helps!", "Happy trading! 🚀"

## HOW YOU FIND INFORMATION

You have access to search tools. Use them to find accurate, up-to-date information:

1. **web_search** - Search the web for Monday Trade documentation
   - Use for: fees, leverage, mechanics, how-to guides, features
   - Good queries: "Monday Trade fees", "Monday Trade leverage", "site:docs.monday.trade [topic]"

2. **x_search** - Search X/Twitter for announcements and news
   - Use for: announcements, updates, news, community questions
   - Good queries: "from:MondayTrade_ [topic]", "@MondayTrade_ announcement"

## CRITICAL RULES

1. **ALWAYS SEARCH** before answering questions about:
   - Fees, leverage, trading pairs
   - Features and how they work
   - Recent announcements or news
   - Anything you're not 100% certain about

2. **NEVER MAKE UP INFORMATION**
   - If you can't find it, say so and suggest checking docs.monday.trade
   - Don't guess about numbers (fees, leverage, etc.)

3. **CITE YOUR SOURCES**
   - When you find information, mention where it came from
   - Example: "According to the Monday Trade docs..."

## OFFICIAL LINKS (the only things you can state without searching)
- App: app.monday.trade
- Docs: docs.monday.trade  
- Twitter/X: @MondayTrade_
- Blog: monday.trade/blog

Remember: Your knowledge comes from SEARCHING, not from memory. Always search first!`;

// Grok Client
let grokClient: OpenAI | null = null;

function getGrokClient(): OpenAI | null {
  if (!process.env.XAI_API_KEY) {
    console.log("⚠️ XAI_API_KEY not configured");
    return null;
  }

  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
    console.log("✅ Grok client initialized");
  }

  return grokClient;
}

// Grok Tools - Enable web and X search
const GROK_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information about Monday Trade. Use for documentation, features, fees, leverage, mechanics, and how-to guides.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query. For Monday Trade docs, try 'site:docs.monday.trade [topic]' or 'Monday Trade [topic]'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "x_search", 
      description: "Search X (Twitter) for Monday Trade announcements, news, and updates. Search for @MondayTrade_ posts.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for X/Twitter. Include 'from:MondayTrade_' for official announcements.",
          },
        },
        required: ["query"],
      },
    },
  },
];

// Main Chat Function
export async function chatWithGrok(
  message: string,
  history: ChatMessage[],
  ragContext?: string | null
): Promise<GrokResponse> {
  const client = getGrokClient();

  if (!client) {
    return {
      content: `I'm having trouble connecting right now. ☕

Please check these resources directly:
• **Docs**: docs.monday.trade
• **App**: app.monday.trade
• **Twitter**: @MondayTrade_

Or try again in a moment!`,
      citations: [],
      toolsUsed: { error: 1 },
    };
  }

  try {
    let systemPrompt = BARISTA_SYSTEM_PROMPT;
    
    if (ragContext) {
      systemPrompt += `\n\n## CONTEXT FROM DOCUMENTATION (check this first before searching)\n${ragContext}`;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    messages.push({ role: "user", content: message });

    console.log(`🔍 Grok query: "${message.substring(0, 60)}..."`);

    const response = await client.chat.completions.create({
      model: "grok-3-latest",
      messages,
      tools: GROK_TOOLS,
      tool_choice: "auto",
      max_tokens: 1000,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message;
    const toolsUsed: Record<string, number> = {};

    if (assistantMessage?.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        toolsUsed[toolName] = (toolsUsed[toolName] || 0) + 1;
        console.log(`🔧 Tool used: ${toolName}`);
      }
    }

    const content = assistantMessage?.content;

    if (!content) {
      return {
        content: `I couldn't find that information. ☕

Try checking:
• **Docs**: docs.monday.trade
• **Twitter**: @MondayTrade_

What else can I help with?`,
        citations: [],
        toolsUsed: { empty_response: 1 },
      };
    }

    if (ragContext) {
      toolsUsed.rag = 1;
    }

    return {
      content,
      citations: [],
      toolsUsed,
    };

  } catch (error) {
    console.error("❌ Grok API error:", error);
    
    return {
      content: `Oops! Something went wrong. ☕

Please try again, or check:
• **Docs**: docs.monday.trade
• **App**: app.monday.trade
• **Twitter**: @MondayTrade_`,
      citations: [],
      toolsUsed: { error: 1 },
    };
  }
}

// Streaming Chat Function
export async function streamChatWithGrok(
  message: string,
  history: ChatMessage[],
  ragContext: string | null,
  onChunk: (chunk: string) => void
): Promise<void> {
  const client = getGrokClient();

  if (!client) {
    onChunk("I'm having trouble connecting. Please try again or visit docs.monday.trade ☕");
    return;
  }

  try {
    let systemPrompt = BARISTA_SYSTEM_PROMPT;
    if (ragContext) {
      systemPrompt += `\n\n## CONTEXT FROM DOCUMENTATION\n${ragContext}`;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    const stream = await client.chat.completions.create({
      model: "grok-3-latest",
      messages,
      tools: GROK_TOOLS,
      tool_choice: "auto",
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }

  } catch (error) {
    console.error("❌ Grok streaming error:", error);
    onChunk("Something went wrong. Please try again or visit docs.monday.trade ☕");
  }
}

// Utility Functions
export function isConfigured(): boolean {
  return !!process.env.XAI_API_KEY;
}

export function getStatus(): { configured: boolean; model: string; tools: string[] } {
  return {
    configured: isConfigured(),
    model: "grok-3-latest",
    tools: ["web_search", "x_search"],
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/services/vectorStore.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "barista-knowledge";
const EMBEDDING_MODEL = "text-embedding-3-small";
const TOP_K = 5;
const MIN_SCORE = 0.7;

let pineconeClient: Pinecone | null = null;
let openaiClient: OpenAI | null = null;

function getPineconeClient(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) {
    return null;
  }

  if (!pineconeClient) {
    try {
      pineconeClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      console.log("✅ Pinecone client initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Pinecone:", error);
      return null;
    }
  }

  return pineconeClient;
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.log("⚠️ OpenAI not configured for embeddings");
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("❌ Embedding error:", error);
    return null;
  }
}

export async function queryKnowledge(query: string): Promise<string | null> {
  const pinecone = getPineconeClient();
  
  if (!pinecone) {
    return null;
  }

  try {
    const embedding = await generateEmbedding(query);
    if (!embedding) {
      return null;
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME);
    
    const results = await index.query({
      vector: embedding,
      topK: TOP_K,
      includeMetadata: true,
    });

    if (!results.matches || results.matches.length === 0) {
      console.log("📭 No RAG matches found");
      return null;
    }

    const relevantDocs = results.matches.filter(
      (match) => match.score && match.score >= MIN_SCORE
    );

    if (relevantDocs.length === 0) {
      console.log("📭 No high-confidence RAG matches");
      return null;
    }

    console.log(`📚 Found ${relevantDocs.length} relevant documents`);

    const context = relevantDocs
      .map((doc, i) => {
        const text = doc.metadata?.text as string || "";
        const title = doc.metadata?.title as string || "Document";
        const url = doc.metadata?.url as string || "";
        
        return `[Source ${i + 1}: ${title}]
${text}
${url ? `(Reference: ${url})` : ""}`;
      })
      .join("\n\n---\n\n");

    return context;

  } catch (error) {
    console.error("❌ RAG query error:", error);
    return null;
  }
}

export async function healthCheck(): Promise<boolean> {
  const pinecone = getPineconeClient();
  if (!pinecone) {
    return false;
  }

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    console.log(`📊 Pinecone: ${stats.totalRecordCount || 0} vectors`);
    return true;
  } catch (error) {
    console.error("❌ Pinecone health check failed:", error);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY && !!process.env.OPENAI_API_KEY;
}

export async function getVectorCount(): Promise<number> {
  const pinecone = getPineconeClient();
  if (!pinecone) return 0;

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    return stats.totalRecordCount || 0;
  } catch {
    return 0;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/services/cache.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";

const CACHE_TTL = 3600;
const CACHE_PREFIX = "barista:chat:";

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log("✅ Redis cache initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Redis:", error);
      return null;
    }
  }

  return redisClient;
}

function generateCacheKey(message: string): string {
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
  
  return `${CACHE_PREFIX}${normalized.substring(0, 100)}`;
}

export async function getCachedResponse(message: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const key = generateCacheKey(message);
    const cached = await redis.get<string>(key);
    
    if (cached) {
      console.log(`📦 Cache hit for: "${message.substring(0, 30)}..."`);
      return cached;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Cache get error:", error);
    return null;
  }
}

export async function setCachedResponse(
  message: string,
  response: string
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const key = generateCacheKey(message);
    await redis.set(key, response, { ex: CACHE_TTL });
    console.log(`💾 Cached response for: "${message.substring(0, 30)}..."`);
  } catch (error) {
    console.error("❌ Cache set error:", error);
  }
}

export async function healthCheck(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("❌ Redis health check failed:", error);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/services/mondayApi.ts
// ═══════════════════════════════════════════════════════════════════════════════

// Monday Trade API Service - Placeholder for future use
// The chatbot uses Grok's search tools for now

export function isConfigured(): boolean {
  return !!(
    process.env.MONDAY_API_KEY &&
    process.env.MONDAY_SECRET_KEY &&
    process.env.MONDAY_PASSPHRASE
  );
}

export function getStatus(): { configured: boolean; message: string } {
  if (isConfigured()) {
    return {
      configured: true,
      message: "Monday Trade API configured",
    };
  }
  
  return {
    configured: false,
    message: "Monday Trade API not configured (optional)",
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/routes.ts
// ═══════════════════════════════════════════════════════════════════════════════

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";

import { chatWithGrok, streamChatWithGrok, isConfigured as isGrokConfigured } from "./services/grok";
import { queryKnowledge, healthCheck as ragHealthCheck, isConfigured as isRagConfigured } from "./services/vectorStore";
import { getCachedResponse, setCachedResponse, healthCheck as cacheHealthCheck, isConfigured as isCacheConfigured } from "./services/cache";
import { isConfigured as isMondayConfigured } from "./services/mondayApi";

// Types
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  sessionId?: string;
}

interface SuggestionPill {
  text: string;
  emoji: string;
}

// Suggestions
const SUGGESTIONS: SuggestionPill[] = [
  { text: "What is Monday Trade?", emoji: "🚀" },
  { text: "Do I need an invite code?", emoji: "🔑" },
  { text: "Trading fees?", emoji: "💰" },
  { text: "Latest announcements", emoji: "📢" },
  { text: "Max leverage?", emoji: "📊" },
  { text: "Voyage Points?", emoji: "⭐" },
  { text: "How to provide liquidity?", emoji: "💧" },
  { text: "Supported wallets?", emoji: "👛" },
];

// Request Validation
function validateChatRequest(body: unknown): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body required" };
  }

  const req = body as Record<string, unknown>;

  if (!req.message || typeof req.message !== "string") {
    return { valid: false, error: "Message is required and must be a string" };
  }

  if (req.message.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (req.message.length > 2000) {
    return { valid: false, error: "Message too long (max 2000 characters)" };
  }

  const history: ChatMessage[] = [];
  if (req.history) {
    if (!Array.isArray(req.history)) {
      return { valid: false, error: "History must be an array" };
    }
    
    for (const msg of req.history) {
      if (
        typeof msg !== "object" ||
        !msg ||
        typeof (msg as Record<string, unknown>).role !== "string" ||
        typeof (msg as Record<string, unknown>).content !== "string"
      ) {
        return { valid: false, error: "Invalid history format" };
      }
      
      const role = (msg as Record<string, unknown>).role as string;
      if (role !== "user" && role !== "assistant") {
        return { valid: false, error: "History role must be 'user' or 'assistant'" };
      }
      
      history.push({
        role: role as "user" | "assistant",
        content: (msg as Record<string, unknown>).content as string,
      });
    }
  }

  return {
    valid: true,
    data: {
      message: req.message.trim(),
      history,
      sessionId: typeof req.sessionId === "string" ? req.sessionId : undefined,
    },
  };
}

// Register Routes
export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Health Check
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
        mondayApi: isMondayConfigured() ? "configured" : "not_configured",
      },
    });
  });

  // Suggestions
  app.get("/api/chat/suggestions", (_req: Request, res: Response) => {
    res.json(SUGGESTIONS);
  });

  // Main Chat Endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const validation = validateChatRequest(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const { message, history, sessionId } = validation.data;
      const currentSessionId = sessionId || randomUUID();

      console.log(`💬 Chat request: "${message.substring(0, 50)}..."`);

      // Check cache
      if (history.length === 0) {
        const cached = await getCachedResponse(message);
        if (cached) {
          res.json({
            response: cached,
            citations: [],
            toolsUsed: { cache: 1 },
            sessionId: currentSessionId,
          });
          return;
        }
      }

      // Get RAG context
      const ragContext = await queryKnowledge(message);

      // Get response from Grok
      const grokResponse = await chatWithGrok(message, history, ragContext);

      // Cache response
      if (history.length === 0) {
        await setCachedResponse(message, grokResponse.content);
      }

      res.json({
        response: grokResponse.content,
        citations: grokResponse.citations,
        toolsUsed: grokResponse.toolsUsed,
        sessionId: currentSessionId,
      });

    } catch (error) {
      console.error("❌ Chat error:", error);
      res.status(500).json({
        error: "Failed to process request",
        response: "I'm having trouble right now. Please try again! ☕",
        citations: [],
        toolsUsed: { error: 1 },
        sessionId: randomUUID(),
      });
    }
  });

  // Streaming Chat Endpoint
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      const validation = validateChatRequest(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const { message, history, sessionId } = validation.data;
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
        ragContext,
        (chunk) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ 
        type: "done",
        toolsUsed: { rag: ragContext ? 1 : 0 },
      })}\n\n`);

      if (history.length === 0) {
        await setCachedResponse(message, fullResponse);
      }

      res.end();

    } catch (error) {
      console.error("❌ Stream error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: "Stream failed" })}\n\n`);
      res.end();
    }
  });

  // Feedback Endpoint
  app.post("/api/chat/feedback", async (req: Request, res: Response) => {
    try {
      const { messageId, feedback } = req.body;

      if (!messageId || !feedback) {
        res.status(400).json({ error: "messageId and feedback required" });
        return;
      }

      if (feedback !== "positive" && feedback !== "negative") {
        res.status(400).json({ error: "feedback must be 'positive' or 'negative'" });
        return;
      }

      console.log(`📝 Feedback: ${messageId} - ${feedback}`);

      res.json({ success: true });

    } catch (error) {
      console.error("❌ Feedback error:", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  return httpServer;
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: server/index.ts
// ═══════════════════════════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

async function start() {
  console.log("\n☕ Starting Barista AI...\n");

  const envStatus = {
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
  };

  console.log("Environment:");
  for (const [key, configured] of Object.entries(envStatus)) {
    console.log(`  ${configured ? "✅" : "⚠️"} ${key}: ${configured ? "configured" : "not configured"}`);
  }
  console.log("");

  const server = await registerRoutes(app);

  server.listen(PORT, () => {
    console.log(`\n🚀 Barista AI running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Chat:   POST http://localhost:${PORT}/api/chat\n`);
  });
}

start().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: scripts/ingest-docs.ts (OPTIONAL - Run once to populate Pinecone)
// ═══════════════════════════════════════════════════════════════════════════════

/*
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "barista-knowledge";

const DOC_PAGES = [
  { url: "https://docs.monday.trade/", title: "What is Monday Trade", section: "Introduction" },
  { url: "https://docs.monday.trade/perps-trading/perps-contract-specifications-and-fees", title: "Specs & Fees", section: "Perps" },
  { url: "https://docs.monday.trade/general/faqs", title: "FAQs", section: "General" },
  { url: "https://docs.monday.trade/general/voyage-point-program", title: "Voyage Points", section: "General" },
  // Add more pages as needed
];

async function main() {
  console.log("☕ Starting documentation ingestion...");
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  
  // Fetch each page, chunk, embed, and upsert to Pinecone
  // See full implementation in barista-backend/scripts/ingest-docs.ts
}

main().catch(console.error);
*/


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: .env.example
// ═══════════════════════════════════════════════════════════════════════════════

/*
# Required
XAI_API_KEY=your_grok_api_key_here

# Optional - Pinecone RAG
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=barista-knowledge

# Optional - Required if using Pinecone
OPENAI_API_KEY=your_openai_api_key_here

# Optional - Redis caching
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here

# Server
PORT=5000
*/


// ═══════════════════════════════════════════════════════════════════════════════
// FILE: package.json (dependencies to add/verify)
// ═══════════════════════════════════════════════════════════════════════════════

/*
{
  "dependencies": {
    "@pinecone-database/pinecone": "^2.0.0",
    "@upstash/redis": "^1.28.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
*/
