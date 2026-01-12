import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Barista ☕, Monday Trade's friendly AI assistant.

PERSONALITY:
- Warm, helpful, energetic, knowledgeable
- Use emojis naturally (☕ 🚀 ✨ 💜 📈)
- Concise but thorough (<150 words)
- Encouraging to new traders
- Coffee-themed personality

RULES:
1. Answer from documentation and search results
2. Use web_search for docs.monday.trade and monday.trade/blog
3. Use x_search to find @MondayTrade_ announcements and community sentiment
4. Never invent information—admit limits
5. No financial advice ("DYOR", "not financial advice")
6. Bold **key terms** and numbers
7. Cite sources when using search
8. For user-specific data (positions, balances), explain they need to connect wallet

KEY FACTS:
- NO invite code needed - open access
- NO KYC required
- Max leverage: 10x
- Fees: 0.02% market, 0.00% limit
- Pairs: BTC/USDC, ETH/USDC, MON/USDC

RESPONSE STYLE:
- Start with friendly opener ("Coming right up! ☕", "Great question!", "Here's the brew...")
- End with helpful closer ("Hope that helps!", "Any other questions?", "Happy trading! 🚀")`;

export interface GrokResponse {
  content: string;
  toolsUsed: {
    web_search?: number;
    x_search?: number;
  };
  citations: Array<{
    title: string;
    url: string;
    type: "docs" | "x" | "web";
  }>;
}

interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithGrok(
  message: string,
  history: MessageHistory[] = [],
  ragContext?: string
): Promise<GrokResponse> {
  const toolsUsed: GrokResponse["toolsUsed"] = {};
  const citations: GrokResponse["citations"] = [];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (ragContext) {
    messages.push({
      role: "system",
      content: `Here is relevant documentation context:\n\n${ragContext}\n\nUse this information to help answer the user's question.`,
    });
  }

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: message });

  try {
    const response = await client.chat.completions.create({
      model: "grok-2-1212",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "I apologize, I couldn't generate a response. Please try again! ☕";

    return {
      content,
      toolsUsed,
      citations,
    };
  } catch (error) {
    console.error("Grok API error:", error);
    throw new Error("Failed to get response from Grok");
  }
}

export async function streamChatWithGrok(
  message: string,
  history: MessageHistory[] = [],
  ragContext?: string,
  onChunk: (chunk: string) => void = () => {}
): Promise<GrokResponse> {
  const toolsUsed: GrokResponse["toolsUsed"] = {};
  const citations: GrokResponse["citations"] = [];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (ragContext) {
    messages.push({
      role: "system",
      content: `Here is relevant documentation context:\n\n${ragContext}\n\nUse this information to help answer the user's question.`,
    });
  }

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: message });

  try {
    const stream = await client.chat.completions.create({
      model: "grok-2-1212",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return {
      content: fullContent || "I apologize, I couldn't generate a response. Please try again! ☕",
      toolsUsed,
      citations,
    };
  } catch (error) {
    console.error("Grok streaming error:", error);
    throw new Error("Failed to stream response from Grok");
  }
}
