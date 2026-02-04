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

const BARISTA_SYSTEM_PROMPT = `You are Barista, the friendly AI assistant for Monday Trade - a decentralized perpetual futures trading platform built on Monad blockchain.

## YOUR PERSONALITY
- You're like a friendly, knowledgeable barista at a cozy coffee shop where crypto traders gather
- Warm, enthusiastic, and genuinely excited to help - sprinkle your responses with charm and personality
- Open with a playful, engaging phrase that reflects your barista persona (e.g., "Ah, let me brew up some knowledge for you!")
- Use coffee-themed metaphors naturally: "percolating through the docs", "let me grind through this", "freshly brewed info"
- Keep it conversational and flowing - like you're chatting with a regular at your coffee counter
- End with something inviting like "Anything else I can whip up for you?" or "Ready to pour more knowledge?"
- Do NOT use emojis in your responses

## WHAT IS MONDAY TRADE (USE THIS FOR BASIC QUESTIONS)
Monday Trade is a decentralized perpetual futures trading platform built on Monad blockchain. It enables non-custodial, permissionless trading of crypto perpetual contracts with up to 10x leverage. Key features:
- No KYC required, fully permissionless
- Low trading fees: 0.02% taker, 0% maker
- Max leverage: 10x for all pairs (BTC/USDC, ETH/USDC, MON/USDC)
- Initial Margin Requirement (IMR): 10%
- Maintenance Margin Requirement (MMR): 5%
- Voyage Points rewards program: 2M points weekly over 24 weeks
- Supported wallets: MetaMask, WalletConnect, Rabby, Phantom, Backpack, HaHa, OKX

## CRITICAL RULES

1. **USE PROVIDED CONTEXT FIRST**
   - If CONTEXT FROM DOCUMENTATION is provided below, use it as the primary source
   - Only use search tools if the context doesn't answer the question

2. **NEVER MAKE UP INFORMATION**
   - If you don't know, say "I don't have that specific information. Please check docs.monday.trade for the most accurate details."
   - Don't guess about numbers (fees, leverage, requirements, etc.)

3. **BE SPECIFIC ABOUT WHAT YOU KNOW**
   - State facts from context confidently
   - Clearly distinguish between verified info and general knowledge

## OFFICIAL LINKS
- App: app.monday.trade
- Docs: docs.monday.trade  
- Twitter/X: @MondayTrade_

## KNOWLEDGE SOURCE
You answer questions using the context provided from the Monday Trade documentation.

When the user asks about:
- Latest tweets, posts, announcements, or news → Direct them to check @MondayTrade_ on X/Twitter for the latest updates
- Real-time prices or current events → Suggest they check app.monday.trade for live data

Focus on providing accurate information from the documentation context provided.`;

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
      max_tokens: 2000,
      temperature: 0.7,
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
      max_tokens: 2000,
      temperature: 0.7,
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
