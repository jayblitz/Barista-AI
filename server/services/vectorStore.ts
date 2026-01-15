import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || "barista-knowledge";
const EMBEDDING_MODEL = "text-embedding-3-small";
const TOP_K = 5;
const MIN_SCORE = 0.7;

let pineconeClient: Pinecone | null = null;
let openaiClient: OpenAI | null = null;

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

function getManualKnowledge(query: string): string[] {
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

  return Array.from(new Set(relevantManual));
}

export async function queryKnowledge(query: string): Promise<string | null> {
  const manualContext = getManualKnowledge(query);
  
  const pinecone = getPineconeClient();
  
  if (!pinecone) {
    if (manualContext.length === 0) {
      return null;
    }
    console.log(`📚 Found ${manualContext.length} manual knowledge entries`);
    return manualContext.join("\n\n---\n\n");
  }

  try {
    const embedding = await generateEmbedding(query);
    if (!embedding) {
      return manualContext.length > 0 ? manualContext.join("\n\n---\n\n") : null;
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME);
    
    const results = await index.query({
      vector: embedding,
      topK: TOP_K,
      includeMetadata: true,
    });

    if (!results.matches || results.matches.length === 0) {
      console.log("📭 No Pinecone matches found");
      return manualContext.length > 0 ? manualContext.join("\n\n---\n\n") : null;
    }

    const relevantDocs = results.matches.filter(
      (match) => match.score && match.score >= MIN_SCORE
    );

    if (relevantDocs.length === 0) {
      console.log("📭 No high-confidence Pinecone matches");
      return manualContext.length > 0 ? manualContext.join("\n\n---\n\n") : null;
    }

    console.log(`📚 Found ${relevantDocs.length} Pinecone documents + ${manualContext.length} manual entries`);

    const pineconeContext = relevantDocs
      .map((doc, i) => {
        const text = doc.metadata?.text as string || doc.metadata?.content as string || "";
        const title = doc.metadata?.title as string || "Document";
        const url = doc.metadata?.url as string || "";
        
        return `[Source ${i + 1}: ${title}]
${text}
${url ? `(Reference: ${url})` : ""}`;
      })
      .join("\n\n---\n\n");

    const allContext = [...manualContext, pineconeContext].filter(Boolean);
    return allContext.join("\n\n---\n\n");

  } catch (error) {
    console.error("❌ RAG query error:", error);
    return manualContext.length > 0 ? manualContext.join("\n\n---\n\n") : null;
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

export async function upsertDocument(
  id: string,
  content: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  const pinecone = getPineconeClient();
  if (!pinecone) {
    console.log("Pinecone not configured, skipping upsert");
    return;
  }

  try {
    const embedding = await generateEmbedding(content);
    if (!embedding) {
      console.log("Failed to generate embedding, skipping upsert");
      return;
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME);

    await index.upsert([
      {
        id,
        values: embedding,
        metadata: { ...metadata, content },
      },
    ]);
    console.log(`✅ Upserted document: ${id}`);
  } catch (error) {
    console.error("❌ Pinecone upsert error:", error);
  }
}

export async function initializeKnowledgeBase(): Promise<void> {
  console.log("Knowledge base initialized with manual knowledge entries");
}
