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
    id: "manual-what-is-monday",
    keywords: ["what", "monday", "trade", "about", "explain", "tell", "describe", "platform", "is monday"],
    content: `What is Monday Trade? Monday Trade is a decentralized perpetual futures trading platform built on Monad blockchain. It enables non-custodial, permissionless trading of crypto perpetual contracts with up to 10x leverage. Key features: No KYC required, fully permissionless access, low trading fees (0.02% taker, 0% maker), support for multiple wallets, and a Voyage Points rewards program. The platform is designed for traders who want full control of their funds while accessing professional-grade trading tools.`,
  },
  {
    id: "manual-access",
    keywords: ["invite", "code", "access", "join", "start", "kyc", "verify", "verification", "sign up", "register", "wallet", "connect"],
    content: `Monday Trade Access & Wallets: NO invite code required - the platform is fully open and permissionless. NO KYC or identity verification needed. Simply connect your wallet and start trading. Supported wallets: MetaMask, WalletConnect, Rabby, Phantom, Backpack, HaHa, and OKX Wallet. To get started: 1) Visit the platform, 2) Click "Connect Wallet", 3) Select your preferred wallet, 4) Approve the connection, 5) Start trading.`,
  },
  {
    id: "manual-fees",
    keywords: ["fee", "fees", "cost", "price", "charge", "commission", "taker", "maker", "execution"],
    content: `Monday Trade Trading Fees: Market orders (taker): 0.02% of position value. Limit orders (maker): 0.00% - makers receive a rebate. Execution fee: 0.01 USDC per order. No deposit or withdrawal fees charged by the platform. Example: A $10,000 market order would cost $2 in trading fees (0.02%).`,
  },
  {
    id: "manual-leverage-margin",
    keywords: ["leverage", "margin", "imr", "mmr", "requirement", "collateral", "initial", "maintenance", "max", "maximum", "multiplier", "x"],
    content: `Leverage & Margin Requirements: Maximum leverage: 10x for all trading pairs. Initial Margin Requirement (IMR): 10% - the minimum margin needed to open a position. Maintenance Margin Requirement (MMR): 5% - if your margin falls below this, liquidation may occur. Example: With 10x leverage, you need $1,000 to control a $10,000 position. Your liquidation price is calculated based on the 5% MMR threshold.`,
  },
  {
    id: "manual-pairs",
    keywords: ["pair", "pairs", "trading", "markets", "btc", "eth", "mon", "usdc", "asset", "crypto", "available"],
    content: `Available Trading Pairs: Currently supported perpetual contracts: BTC/USDC (Bitcoin), ETH/USDC (Ethereum), MON/USDC (Monad native token). All pairs support up to 10x leverage. More pairs may be added as the platform evolves.`,
  },
  {
    id: "manual-voyage",
    keywords: ["voyage", "point", "points", "reward", "rewards", "earn", "airdrop", "incentive", "bonus", "referral"],
    content: `Voyage Points Program: Total allocation: 2,000,000 points distributed weekly over 24 weeks. How to earn: Trading volume (primary method), Providing liquidity (LP), Holding positions, Referral program (20% bonus on referred users' points). Points may be converted to platform tokens in the future. Check the Voyage dashboard to track your points accumulation.`,
  },
  {
    id: "manual-stop-loss",
    keywords: ["stop", "loss", "sl", "tp", "take", "profit", "order", "close", "protect", "risk"],
    content: `Stop Loss & Take Profit: When opening a position, click "TP/SL" to set protective orders. Stop Loss: Automatically closes your position when price moves against you to a specified level. Take Profit: Automatically closes your position when price reaches your target profit level. You can modify TP/SL after opening a position from the Positions tab. Recommended: Always use stop-loss orders to manage risk, especially with leveraged positions.`,
  },
  {
    id: "manual-funding",
    keywords: ["funding", "rate", "rates", "8 hour", "hourly", "periodic", "payment", "long", "short"],
    content: `Funding Rate Mechanism: Funding rates keep perpetual prices aligned with spot prices. Settlement: Every 8 hours. Positive funding rate: Long positions pay shorts. Negative funding rate: Short positions pay longs. The rate is variable based on the difference between perpetual and spot prices. Check the current funding rate on the trading interface before opening positions, as it affects your holding costs.`,
  },
  {
    id: "manual-liquidation",
    keywords: ["liquidat", "liquid", "margin call", "closed", "forced", "risk", "wipe"],
    content: `Liquidation Process: Liquidation occurs when your margin falls below the 5% Maintenance Margin Requirement (MMR). The liquidation engine automatically closes your position to prevent negative equity. Remaining margin (if any) is returned after fees. To avoid liquidation: Use lower leverage, set stop-losses, add more margin, or reduce position size. Monitor your liquidation price shown in the Positions tab.`,
  },
  {
    id: "manual-deposit-withdraw",
    keywords: ["deposit", "withdraw", "fund", "money", "usdc", "balance", "transfer", "add"],
    content: `Deposits & Withdrawals: Monday Trade is non-custodial - you maintain control of your funds. Deposit: Send USDC to your trading account from your connected wallet. Withdraw: Request withdrawal anytime - funds return to your wallet. No platform deposit/withdrawal fees (only network gas fees apply). Ensure you have sufficient USDC on Monad network for trading.`,
  },
  {
    id: "manual-monad",
    keywords: ["monad", "blockchain", "chain", "network", "l1", "layer"],
    content: `Monad Blockchain: Monday Trade is built on Monad, a high-performance Layer 1 blockchain. Benefits: Fast transaction finality, low gas fees, high throughput. You'll need MON tokens for gas fees when interacting with the platform. Monad is EVM-compatible, so you can use familiar Ethereum wallets.`,
  },
  {
    id: "manual-security",
    keywords: ["security", "safe", "secure", "custod", "audit", "trust", "risk", "funds"],
    content: `Security & Non-Custodial: Monday Trade is fully non-custodial - you always control your private keys. Funds are held in smart contracts, not by the platform. The platform uses transparent, auditable smart contracts. Trading is done via signed transactions from your wallet. Always verify you're on the official Monday Trade site to avoid phishing.`,
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
    const matchScore = knowledge.keywords.filter(keyword => 
      queryLower.includes(keyword.toLowerCase())
    ).length;

    if (matchScore >= 1) {
      relevantManual.push(knowledge.content);
    }
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
