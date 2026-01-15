import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || "barista-knowledge";
const TOP_K = 5;
const MIN_SCORE = 0.7;

let pineconeClient: Pinecone | null = null;

const MANUAL_KNOWLEDGE = [
  {
    id: "what-is-monday-trade",
    keywords: ["what", "monday", "trade", "about", "explain", "tell", "describe", "platform", "is monday", "overview", "introduce"],
    content: `What is Monday Trade? Monday Trade is Monad's native spot and perps DEX that offers the best of CEX and DEX trading experience. It's a decentralized perpetual futures and spot trading platform built on Monad blockchain. Monad's low latency enables Monday Trade to execute trades within milliseconds, ensuring traders can make the most of market moves, without giving up their asset ownership to centralized exchanges.

Monday Trade combines the precision of a fully on-chain order book with the simplicity of AMMs into one sleek UI, delivering gas-efficient, high-performance onchain trades with optional advanced trading tools.

Key Features:
- Lightning-fast execution with millisecond settlement
- Hybrid market structure (AMM + Order Book)
- Non-custodial and permissionless trading
- No KYC required
- Up to 10x leverage on perpetuals
- Low fees: 0.02% taker, 0% maker for perps

Built on SynFutures' battle-tested infrastructure with over $300B in trading volume.`
  },
  {
    id: "perps-fees-leverage",
    keywords: ["fee", "fees", "leverage", "margin", "imr", "mmr", "requirement", "cost", "price", "charge", "taker", "maker", "execution", "perp", "perpetual", "contract"],
    content: `Monday Trade Perpetual Futures Trading Fees and Leverage:

Trading Pairs with Specifications:

BTC/USDC:
- Maximum Leverage: 10x
- Initial Margin Requirement (IMR): 10%
- Maintenance Margin Requirement (MMR): 5%
- Execution Fee: 0.01 USDC
- Market Order Fee (Taker): 0.02%
- Limit Order Fee Rebate (Maker): 0.00%

ETH/USDC:
- Maximum Leverage: 10x
- IMR: 10%, MMR: 5%
- Same fee structure as BTC/USDC

MON/USDC:
- Maximum Leverage: 10x
- IMR: 10%, MMR: 5%
- Same fee structure as BTC/USDC

Example: With 10x leverage, you need $1,000 margin to control a $10,000 position.`
  },
  {
    id: "spot-fees",
    keywords: ["spot", "swap", "trade", "fee", "amm", "order book", "taker"],
    content: `Monday Trade Spot Trading Fees (verified from docs.monday.trade):

The platform uses a hybrid AMM + Order Book model:

Order Book Fees:
- Taker Fee: 0.03% (for all pools)
- Maker Fee: 0% (limit orders)

AMM Fees (vary by pool):
- MON/USDC: 0.05%
- gMON/MON: 0.03%
- WBTC/USDC: 0.3%

Example: Trading 100 MON in a pool with 0.05% AMM fee. If 90 MON fills via order book and 10 MON via AMM:
- Order book portion: 90 MON × 0.03% = 0.027 MON
- AMM portion: 10 MON × 0.05% = 0.005 MON
- Total fee: 0.032 MON

The hybrid model routes through order book first for best pricing.`
  },
  {
    id: "access-wallets-kyc",
    keywords: ["invite", "code", "access", "join", "start", "kyc", "verify", "verification", "sign up", "register", "wallet", "connect", "metamask", "rabby", "phantom"],
    content: `Monday Trade Access & Wallets:

NO invite code required - the platform is fully open and permissionless.
NO KYC or identity verification needed.

Supported Wallets:
- MetaMask
- WalletConnect
- Rabby
- Phantom
- Backpack
- HaHa Wallet
- OKX Wallet

How to Start:
1. Visit app.monday.trade
2. Click "Connect Wallet"
3. Select your preferred wallet
4. Approve the connection
5. Ensure you have MON tokens for gas fees
6. Start trading!

Mobile trading is supported via wallets with dApp browsers (Rabby Mobile, Phantom, OKX).`
  },
  {
    id: "liquidation",
    keywords: ["liquidat", "liquid", "margin call", "closed", "forced", "bankrupt", "insurance", "mmr"],
    content: `Monday Trade Liquidation System:

When Liquidation Occurs:
Positions are liquidated when margin falls below the 5% Maintenance Margin Requirement (MMR).

Liquidation Methods:

1. Taking-Over Approach (Primary):
- Liquidator takes over the position and remaining margin
- Tops up margin to meet 10% IMR
- Remaining margin is potential profit for liquidator

2. Forced Close Approach:
- Position is forced to trade against AMM to close
- Trading fee is charged
- Remaining margins go to insurance fund

Partial Liquidation: Both methods support partial liquidation for large positions.

Insurance Fund: First used to cover losses if position is bankrupted. If insufficient, losses are socialized to profitable opposite positions.

To Avoid Liquidation:
- Use lower leverage
- Set stop-loss orders
- Add more margin
- Reduce position size
- Monitor your liquidation price`
  },
  {
    id: "funding-rate",
    keywords: ["funding", "rate", "rates", "8 hour", "hourly", "periodic", "payment", "long", "short"],
    content: `Monday Trade Funding Rate Mechanism:

Purpose: Keep perpetual futures prices aligned with spot prices.

Formula: FundingFeeRate = ((P_fair - P_spot) / P_spot) × (Δt / Interval)

Funding Intervals: 1 hour, 8 hours, or 24 hours depending on the trading pair.

When Funding is Realized:
- When positions are increased
- When positions are reduced or closed
- When margin is adjusted

Direction:
- Positive funding rate: Longs pay shorts (perp > spot)
- Negative funding rate: Shorts pay longs (perp < spot)

Check the current funding rate on the trading interface before opening positions.`
  },
  {
    id: "voyage-points",
    keywords: ["voyage", "point", "points", "reward", "rewards", "earn", "airdrop", "incentive", "bonus", "referral", "program"],
    content: `Voyage Point Program:

Duration: 24-week campaign
Distribution: Points calculated and distributed weekly (Monday 00:00 UTC to Sunday 23:59 UTC)

How to Earn Points:

Spot Market:
- Limit Orders (Maker): Points when orders fill
- Liquidity Provision: Supply to AMM pools
- Market Orders (Taker): Execute market orders

Perp Market:
- Limit Orders (Maker)
- Liquidity Provision
- Market Orders (Taker)
- Position Holding: Bonus multipliers for holding positions

Market Multipliers:
- Spot MON/USDC: 4X
- Perp BTC/USDC, ETH/USDC, MON/USDC: 5X
- Spot AUSD/earnAUSD: 3X
- Spot gMON/MON, WBTC/USDC: 2X

Consistency Bonus: Trade 7 consecutive days for bonus multiplier.
Referral: Earn 20% of referred users' points.`
  },
  {
    id: "order-types",
    keywords: ["stop", "loss", "sl", "tp", "take", "profit", "order", "close", "protect", "risk", "limit", "market", "type"],
    content: `Order Types on Monday Trade (from docs.monday.trade):

Market Orders:
- Trade with the perps engine directly
- Counterparty can be limit orders or concentrated liquidity
- Price impact estimated before trade
- Limit price protects against adverse moves

Limit Orders:
- Native limit orders similar to centralized exchanges
- Defined at discrete price points
- Become irreversible once filled
- Tick-based pricing system (1.0001^n increments)

Matching:
- Limit orders filled before concentrated liquidity
- Volume allocated proportionally across orders at same price
- Overall slippage reduced when limit orders exist

Execution Fees:
- Small fee paid when orders are settled on-chain
- Compensates the address submitting the settlement transaction

For risk management, monitor your positions and liquidation price carefully.`
  },
  {
    id: "trading-pairs",
    keywords: ["pair", "pairs", "trading", "markets", "btc", "eth", "mon", "usdc", "asset", "crypto", "available", "list"],
    content: `Monday Trade Available Trading Pairs (verified from docs.monday.trade):

Perpetual Futures:
- BTC/USDC (10x leverage, 0.02% taker fee)
- ETH/USDC (10x leverage, 0.02% taker fee)
- MON/USDC (10x leverage, 0.02% taker fee)

Verified Spot Pools:
- MON/USDC - 0.05% fee (0x8f889BA499C0A176Fb8F233D9D35b1c132eB868C)
- MON/USDC - 0.3% fee (0x0a439a3a809dcfa8565625839f74368b0e7d0e3c)
- gMON/MON - 0.03% fee
- gMON/MON - 0.01% fee
- AUSD/earnAUSD - 0.03% fee
- WBTC/USDC - 0.3% fee

Pool Creation: Users can create new liquidity pools for any ERC-20 token pair permissionlessly.`
  },
  {
    id: "monad-blockchain",
    keywords: ["monad", "blockchain", "chain", "network", "l1", "layer", "gas", "mon token", "evm"],
    content: `Monad Blockchain - Why Monday Trade Uses It:

Performance:
- 10,000 TPS throughput
- 500ms block times
- 1-second finality

This enables CEX-like experience with instant trade confirmations and negligible transaction costs.

EVM Compatibility: Monad is fully EVM-equivalent. All Ethereum wallets and tools work out of the box.

MON Token: Used for gas fees on Monad network. You need MON tokens to pay for transactions.

Architecture: Uses parallel execution and superscalar pipelining for high throughput while maintaining decentralization.

Decentralized: Proof-of-Stake with MonadBFT consensus. Anyone can run a full node.`
  },
  {
    id: "security-noncustodial",
    keywords: ["security", "safe", "secure", "custod", "audit", "trust", "risk", "funds", "non-custodial"],
    content: `Monday Trade Security & Non-Custodial Features:

Non-Custodial: You always control your private keys. Funds are held in smart contracts, not by the platform.

On-Chain Execution: All trades executed fully on-chain for transparency and auditability.

Proven Infrastructure: Built on SynFutures' battle-tested infrastructure with over $300B in trading volume.

Risk Disclosure:
- Smart contract risk exists in all DeFi protocols
- Leveraged positions can be liquidated
- Cryptocurrency prices are volatile
- Liquidity providers may experience impermanent loss

Best Practices:
- Use appropriate leverage for your risk tolerance
- Set stop-loss orders to limit downside
- Never trade more than you can afford to lose
- Verify you're on the official site (app.monday.trade)`
  },
  {
    id: "how-to-start",
    keywords: ["start", "begin", "how to", "trade", "guide", "tutorial", "getting started", "first"],
    content: `How to Start Trading on Monday Trade:

Step 1: Set Up Your Wallet
- Add Monad network to MetaMask or your preferred wallet
- Get MON tokens for gas fees

Step 2: Connect to Monday Trade
- Visit app.monday.trade
- Click "Connect Wallet"
- Select your wallet and approve connection

Step 3: Deposit Funds
- Deposit USDC or other supported assets
- Ensure you have MON for gas

Step 4: Start Trading
- Choose Spot or Perps section
- Select your trading pair
- Enter order details
- Confirm transaction

No sign-up, email, or KYC required. Just connect and trade!`
  },
  {
    id: "liquidity-provision",
    keywords: ["liquidity", "lp", "pool", "provide", "yield", "impermanent", "loss", "amm"],
    content: `Providing Liquidity on Monday Trade:

How to Add Liquidity:
1. Navigate to Pools section
2. Select an existing pool or create new one
3. Click "Add Liquidity"
4. Enter amounts for each token
5. Review price range (for concentrated liquidity)
6. Confirm transaction

Earnings:
- Trading fees proportional to your liquidity share
- Voyage Points during reward program

Impermanent Loss: Occurs when token price ratios change. Greater price changes = more significant loss compared to holding.

Tips:
- Start with stablecoin pairs for lower IL risk
- Concentrated liquidity positions are more capital efficient
- Monitor positions regularly during volatile markets`
  },
  {
    id: "glossary",
    keywords: ["term", "definition", "mean", "glossary", "explain"],
    content: `Monday Trade Glossary:

AMM: Automated Market Maker - uses liquidity pools and formulas to price assets.
Funding Rate: Periodic payments between longs and shorts to align perp with spot price.
IMR: Initial Margin Requirement (10%) - minimum margin to open a position.
MMR: Maintenance Margin Requirement (5%) - minimum to keep position open.
Leverage: Multiplier for trading exposure (up to 10x on Monday Trade).
Liquidation: Forced closure when margin falls below MMR.
Pearl: Data structure representing liquidity at each price point.
Perpetual Futures: Derivative contracts with no expiry tracking underlying asset.
Slippage: Difference between expected and executed price.
Taker: Executes against existing liquidity (pays 0.02% on perps).
Maker: Provides liquidity via limit orders (earns 0% rebate).`
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

async function generateEmbedding(text: string): Promise<number[] | null> {
  return null;
}

const DEFAULT_OVERVIEW = `Monday Trade is Monad's native spot and perps DEX - a decentralized perpetual futures and spot trading platform. Key facts:
- Non-custodial, permissionless, no KYC
- Perpetual futures: BTC, ETH, MON vs USDC with 10x leverage
- Perps fees: 0.02% taker, 0% maker
- Spot fees: 0.03% order book taker, AMM varies (0.03%-0.3%)
- Initial margin: 10%, Maintenance margin: 5%
- Voyage Points program for rewards
For specific questions, please ask about trading pairs, fees, leverage, margin, liquidation, wallets, or the Voyage Point program.`;

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

  if (relevantManual.length === 0) {
    relevantManual.push(DEFAULT_OVERVIEW);
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
        const text = doc.metadata?.content as string || doc.metadata?.text as string || "";
        const title = doc.metadata?.title as string || "Document";
        const url = doc.metadata?.url as string || "";
        
        return `[Source: ${title}]
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
  return !!process.env.PINECONE_API_KEY && !!process.env.XAI_API_KEY;
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
