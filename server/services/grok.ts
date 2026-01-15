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

const BARISTA_SYSTEM_PROMPT = `You are Barista ☕, the friendly AI assistant for Monday Trade - a decentralized perpetual futures trading platform built on Monad blockchain.

## YOUR PERSONALITY
- Warm, helpful, and enthusiastic - like a friendly barista at a coffee shop
- Expert but approachable, never condescending
- Use emojis sparingly: ☕ 🚀 ✨ 💜
- Keep responses concise (under 200 words unless detail is needed)
- Be direct and informative - traders value accuracy over friendliness

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
- Twitter/X: @MondayTrade_`;

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

export async function chatWithGrok(
  message: string,
  history: ChatMessage[] = [],
  ragContext?: string
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
        if ('function' in toolCall && toolCall.function) {
          const toolName = toolCall.function.name;
          toolsUsed[toolName] = (toolsUsed[toolName] || 0) + 1;
          console.log(`🔧 Tool used: ${toolName}`);
        }
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
    onChunk("I'm having trouble connecting. Please try again or visit docs.monday.trade ☕");
    return {
      content: "I'm having trouble connecting. Please try again or visit docs.monday.trade ☕",
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

    const stream = await client.chat.completions.create({
      model: "grok-3-latest",
      messages,
      tools: GROK_TOOLS,
      tool_choice: "auto",
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return {
      content: fullContent || "I apologize, I couldn't generate a response. Please try again! ☕",
      citations,
      toolsUsed,
    };

  } catch (error) {
    console.error("❌ Grok streaming error:", error);
    onChunk("Something went wrong. Please try again or visit docs.monday.trade ☕");
    return {
      content: "Something went wrong. Please try again or visit docs.monday.trade ☕",
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
    model: "grok-3-latest",
    tools: ["web_search", "x_search"],
  };
}
