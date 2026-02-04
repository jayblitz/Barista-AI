import OpenAI from "openai";

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

    // For Twitter/announcement queries, add helpful link to @MondayTrade_
    const isTwitterQuery = message.toLowerCase().includes("tweet") || 
                           message.toLowerCase().includes("twitter") || 
                           message.toLowerCase().includes(" x ") ||
                           message.toLowerCase().includes("post") ||
                           message.toLowerCase().includes("announcement") ||
                           message.toLowerCase().includes("latest") ||
                           message.toLowerCase().includes("news");
    
    if (isTwitterQuery) {
      allCitations.push({ 
        title: "@MondayTrade_ on X", 
        url: "https://x.com/MondayTrade_", 
        type: "x" 
      });
    }

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
    model: "grok-3",
    tools: ["rag"],
  };
}
