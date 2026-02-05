import OpenAI from "openai";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GrokResponse {
  content: string;
  citations: Array<{
    title: string;
    url: string;
    type: "docs" | "x" | "web";
  }>;
  toolsUsed: Record<string, number>;
}

interface LiveSearchResult {
  content: string;
  citations: Array<{ id?: string; title: string; url: string; type: string }>;
  error?: string;
  tools_used?: string[];
}

function isLiveSearchQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Time-related keywords that suggest user wants current/fresh information
  const timeKeywords = [
    "latest",
    "recent",
    "news",
    "tweet",
    "twitter",
    "post",
    "announcement",
    "update",
    "what's new",
    "whats new",
    "coming soon",
    "roadmap",
    "today",
    "current",
    "now",
    "live",
    "ongoing",
    "active",
    "running",
    "happening",
    "this week",
    "this month",
  ];
  
  // Topic-based triggers - these subjects are time-sensitive and change frequently
  // so we should always search X for accurate answers
  const timeSensitiveTopics = [
    "campaign",
    "promotion",
    "airdrop",
    "event",
    "contest",
    "partnership",
    "listing",
    "launch",
    "tvl",
    "incentive",
    "reward program",
    "points program",
    "voyage points",
    "testnet",
    "mainnet",
    "migration",
  ];
  
  // Trigger search if message contains time keywords OR time-sensitive topics
  const hasTimeKeyword = timeKeywords.some((keyword) => lowerMessage.includes(keyword));
  const hasTimeSensitiveTopic = timeSensitiveTopics.some((topic) => lowerMessage.includes(topic));
  
  return hasTimeKeyword || hasTimeSensitiveTopic;
}

function truncateToTwoSentences(text: string): string {
  const citationPattern = /\[\[\d+\]\]\([^)]+\)/g;
  const placeholders: string[] = [];
  let tempText = text.replace(citationPattern, (match) => {
    placeholders.push(match);
    return `__CITE_${placeholders.length - 1}__`;
  });
  
  const sentences = tempText.match(/[^.!?]*[.!?]+/g) || [tempText];
  let result = sentences.slice(0, 2).join(" ").trim();
  
  placeholders.forEach((citation, index) => {
    result = result.replace(`__CITE_${index}__`, citation);
  });
  
  return result;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/_/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .trim();
}

async function performLiveSearch(
  query: string,
  searchType: "x" | "web" | "both" = "x",
  xHandle?: string
): Promise<LiveSearchResult> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (result: LiveSearchResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const scriptPath = path.join(__dirname, "../scripts/xai_search.py");
    const args = [scriptPath, query, searchType];
    if (xHandle) args.push(xHandle);

    console.log(`[LIVE SEARCH] Executing search for: ${query.substring(0, 50)}...`);

    const pythonProcess = spawn("python3", args, {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[LIVE SEARCH] Python script error: ${stderr}`);
        safeResolve({
          content: "Live search is temporarily unavailable. Check @MondayTrade_ on X for updates.",
          citations: [{ title: "@MondayTrade_ on X", url: "https://x.com/MondayTrade_", type: "x" }],
          error: stderr,
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        let content = result.content || "";
        content = stripMarkdown(content);
        content = truncateToTwoSentences(content);
        result.content = content;
        console.log(`[LIVE SEARCH] Success: ${content.substring(0, 100)}...`);
        safeResolve(result);
      } catch (e) {
        console.error(`[LIVE SEARCH] JSON parse error: ${e}`);
        safeResolve({
          content: "Live search is temporarily unavailable. Check @MondayTrade_ on X for updates.",
          citations: [{ title: "@MondayTrade_ on X", url: "https://x.com/MondayTrade_", type: "x" }],
          error: "Failed to parse search results",
        });
      }
    });

    pythonProcess.on("error", (err) => {
      console.error(`[LIVE SEARCH] Process error: ${err}`);
      safeResolve({
        content: "Live search is temporarily unavailable. Check @MondayTrade_ on X for updates.",
        citations: [{ title: "@MondayTrade_ on X", url: "https://x.com/MondayTrade_", type: "x" }],
        error: err.message,
      });
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        pythonProcess.kill();
        safeResolve({
          content: "Search timed out. Check @MondayTrade_ on X for the latest updates.",
          citations: [{ title: "@MondayTrade_ on X", url: "https://x.com/MondayTrade_", type: "x" }],
          error: "timeout",
        });
      }
    }, 30000);
  });
}

const BARISTA_SYSTEM_PROMPT = `You are Barista, the AI assistant for Monday Trade.

CRITICAL RULES:
1. MAX 2 sentences per response. Never more.
2. One paragraph only. No sections, headers, or bullet lists.
3. Answer only what was asked. No extra info.
4. No emojis.

Examples:
- Fees: "Perpetual futures: 0.02% taker, 0% maker. Spot: 0.03% taker, 0% maker."
- Leverage: "Up to 10x leverage on BTC/USDC, ETH/USDC, and MON/USDC."
- What is MT: "Monday Trade is a decentralized perps DEX on Monad with up to 10x leverage and no KYC."

If unsure, say so briefly. For news check @MondayTrade_ on X. For prices see app.monday.trade.`;

let grokClient: OpenAI | null = null;

function getGrokClient(): OpenAI | null {
  if (!process.env.XAI_API_KEY) {
    console.log("[WARN] XAI_API_KEY not configured");
    return null;
  }

  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
    console.log("[OK] Grok client initialized");
  }

  return grokClient;
}


export async function chatWithGrok(
  message: string,
  history: ChatMessage[] = [],
  ragContext?: string
): Promise<GrokResponse> {
  const client = getGrokClient();

  if (!client) {
    return {
      content: `I'm having trouble connecting right now.

Please check these resources directly:
- **Docs**: docs.monday.trade
- **App**: app.monday.trade
- **Twitter**: @MondayTrade_

Or try again in a moment!`,
      citations: [],
      toolsUsed: { error: 1 },
    };
  }

  if (isLiveSearchQuery(message)) {
    console.log(`[QUERY] Live search detected: "${message.substring(0, 60)}..."`);
    
    const searchResult = await performLiveSearch(
      `Monday Trade @MondayTrade_ ${message}`,
      "x",
      "MondayTrade_"
    );
    
    const citations: GrokResponse["citations"] = searchResult.citations.map((c) => ({
      title: c.title,
      url: c.url,
      type: c.type as "docs" | "x" | "web",
    }));
    
    return {
      content: searchResult.content,
      citations,
      toolsUsed: { live_search: 1 },
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

    console.log(`[QUERY] Grok query: "${message.substring(0, 60)}..."`);

    const requestBody: any = {
      model: "grok-3",
      messages,
      max_tokens: 150,
      temperature: 0.2,
    };

    const response = await client.chat.completions.create(requestBody);

    const assistantMessage = response.choices[0]?.message;
    const content = assistantMessage?.content;
    const toolsUsed: Record<string, number> = {};
    const allCitations: GrokResponse["citations"] = [];

    if (!content) {
      return {
        content: `I couldn't find that information.

Try checking:
- **Docs**: docs.monday.trade
- **Twitter**: @MondayTrade_

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
      citations: allCitations,
      toolsUsed,
    };

  } catch (error) {
    console.error("[ERROR] Grok API error:", error);
    
    return {
      content: `Oops! Something went wrong.

Please try again, or check:
- **Docs**: docs.monday.trade
- **App**: app.monday.trade
- **Twitter**: @MondayTrade_`,
      citations: [],
      toolsUsed: { error: 1 },
    };
  }
}

export async function streamChatWithGrok(
  message: string,
  history: ChatMessage[] = [],
  ragContext?: string,
  onChunk: (chunk: string) => void = () => {}
): Promise<GrokResponse> {
  const client = getGrokClient();
  const toolsUsed: Record<string, number> = {};
  const citations: GrokResponse["citations"] = [];

  if (!client) {
    onChunk("I'm having trouble connecting. Please try again or visit docs.monday.trade");
    return {
      content: "I'm having trouble connecting. Please try again or visit docs.monday.trade",
      citations: [],
      toolsUsed: { error: 1 },
    };
  }

  if (isLiveSearchQuery(message)) {
    console.log(`[STREAM] Live search detected: "${message.substring(0, 60)}..."`);
    
    const searchResult = await performLiveSearch(
      `Monday Trade @MondayTrade_ ${message}`,
      "x",
      "MondayTrade_"
    );
    
    onChunk(searchResult.content);
    
    const resultCitations: GrokResponse["citations"] = searchResult.citations.map((c) => ({
      title: c.title,
      url: c.url,
      type: c.type as "docs" | "x" | "web",
    }));
    
    return {
      content: searchResult.content,
      citations: resultCitations,
      toolsUsed: { live_search: 1 },
    };
  }

  try {
    let systemPrompt = BARISTA_SYSTEM_PROMPT;
    if (ragContext) {
      systemPrompt += `\n\n## CONTEXT FROM DOCUMENTATION\n${ragContext}`;
      toolsUsed.rag = 1;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    const requestBody: any = {
      model: "grok-3",
      messages,
      max_tokens: 150,
      temperature: 0.2,
      stream: true,
    };

    const stream = await client.chat.completions.create(requestBody) as unknown as AsyncIterable<any>;

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return {
      content: fullContent || "I apologize, I couldn't generate a response. Please try again!",
      citations,
      toolsUsed,
    };

  } catch (error) {
    console.error("[ERROR] Grok streaming error:", error);
    onChunk("Something went wrong. Please try again or visit docs.monday.trade");
    return {
      content: "Something went wrong. Please try again or visit docs.monday.trade",
      citations: [],
      toolsUsed: { error: 1 },
    };
  }
}

export function isConfigured(): boolean {
  return !!process.env.XAI_API_KEY;
}

export function getStatus(): { configured: boolean; model: string; tools: string[] } {
  return {
    configured: isConfigured(),
    model: "grok-3 + grok-4-1-fast (live search)",
    tools: ["rag", "live_search", "x_search", "web_search"],
  };
}
