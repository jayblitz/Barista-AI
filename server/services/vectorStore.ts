import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INDEX_NAME = process.env.PINECONE_INDEX || "barista-knowledge";

const MANUAL_KNOWLEDGE = [
  {
    id: "manual-access",
    content: `Monday Trade Access: NO invite code required - fully open access. NO KYC needed - permissionless. Supported wallets: MetaMask, WalletConnect, Rabby, Phantom, Backpack, HaHa, OKX.`,
  },
  {
    id: "manual-fees",
    content: `Trading Fees: Market orders 0.02%, Limit orders 0.00% (maker rebate), Execution fee 0.01 USDC.`,
  },
  {
    id: "manual-leverage",
    content: `Leverage: Max 10x for all pairs. IMR 10%, MMR 5%. Pairs: BTC/USDC, ETH/USDC, MON/USDC.`,
  },
  {
    id: "manual-voyage",
    content: `Voyage Points: 2,000,000 points weekly, 24 weeks. Earn via trading, LP, holding, referrals (20% bonus).`,
  },
  {
    id: "manual-what-is",
    content: `Monday Trade is a decentralized perpetual futures trading platform built on Monad blockchain. It offers non-custodial trading with up to 10x leverage, low fees, and no KYC requirements.`,
  },
  {
    id: "manual-stop-loss",
    content: `Stop Loss on Monday Trade: You can set stop-loss orders when opening a position. Go to the trading interface, select your position size and leverage, then click on "TP/SL" to set your stop-loss price. The stop-loss will automatically close your position when the price reaches your specified level.`,
  },
  {
    id: "manual-funding",
    content: `Funding Rate: Monday Trade uses a funding rate mechanism to keep perpetual prices aligned with spot prices. Funding is exchanged between long and short traders every 8 hours. Positive rates mean longs pay shorts; negative rates mean shorts pay longs.`,
  },
  {
    id: "manual-liquidation",
    content: `Liquidation: Positions are liquidated when margin falls below the Maintenance Margin Requirement (MMR) of 5%. The liquidation engine ensures orderly position closure to protect the system. Use appropriate leverage and stop-losses to manage risk.`,
  },
];

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding error:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function queryKnowledge(query: string, topK: number = 3): Promise<string> {
  const queryLower = query.toLowerCase();
  const relevantManual: string[] = [];

  for (const knowledge of MANUAL_KNOWLEDGE) {
    const contentLower = knowledge.content.toLowerCase();
    const keywords = queryLower.split(/\s+/);
    
    const isRelevant = keywords.some(keyword => 
      keyword.length > 3 && contentLower.includes(keyword)
    );

    if (isRelevant) {
      relevantManual.push(knowledge.content);
    }
  }

  if (queryLower.includes("invite") || queryLower.includes("code") || queryLower.includes("access")) {
    relevantManual.push(MANUAL_KNOWLEDGE[0].content);
  }
  if (queryLower.includes("fee") || queryLower.includes("cost") || queryLower.includes("price")) {
    relevantManual.push(MANUAL_KNOWLEDGE[1].content);
  }
  if (queryLower.includes("leverage") || queryLower.includes("pair") || queryLower.includes("trading")) {
    relevantManual.push(MANUAL_KNOWLEDGE[2].content);
  }
  if (queryLower.includes("voyage") || queryLower.includes("point") || queryLower.includes("reward")) {
    relevantManual.push(MANUAL_KNOWLEDGE[3].content);
  }
  if (queryLower.includes("what is") || queryLower.includes("monday trade")) {
    relevantManual.push(MANUAL_KNOWLEDGE[4].content);
  }
  if (queryLower.includes("stop") || queryLower.includes("loss") || queryLower.includes("sl")) {
    relevantManual.push(MANUAL_KNOWLEDGE[5].content);
  }
  if (queryLower.includes("funding") || queryLower.includes("rate")) {
    relevantManual.push(MANUAL_KNOWLEDGE[6].content);
  }
  if (queryLower.includes("liquidat")) {
    relevantManual.push(MANUAL_KNOWLEDGE[7].content);
  }

  const uniqueManual = [...new Set(relevantManual)];

  try {
    if (!process.env.PINECONE_API_KEY) {
      return uniqueManual.join("\n\n");
    }

    const index = pinecone.Index(INDEX_NAME);
    const queryEmbedding = await getEmbedding(query);

    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    const pineconeContext = results.matches
      ?.filter((match) => (match.score || 0) > 0.7)
      .map((match) => match.metadata?.content as string)
      .filter(Boolean) || [];

    return [...uniqueManual, ...pineconeContext].join("\n\n");
  } catch (error) {
    console.error("Pinecone query error:", error);
    return uniqueManual.join("\n\n");
  }
}

export async function upsertDocument(
  id: string,
  content: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  try {
    if (!process.env.PINECONE_API_KEY) {
      console.log("Pinecone not configured, skipping upsert");
      return;
    }

    const index = pinecone.Index(INDEX_NAME);
    const embedding = await getEmbedding(content);

    await index.upsert([
      {
        id,
        values: embedding,
        metadata: { ...metadata, content },
      },
    ]);
  } catch (error) {
    console.error("Pinecone upsert error:", error);
  }
}

export async function initializeKnowledgeBase(): Promise<void> {
  console.log("Knowledge base initialized with manual knowledge entries");

  for (const entry of MANUAL_KNOWLEDGE) {
    try {
      await upsertDocument(entry.id, entry.content, { source: "manual" });
    } catch (error) {
      console.error(`Failed to upsert ${entry.id}:`, error);
    }
  }
}
