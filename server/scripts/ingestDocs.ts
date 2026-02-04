import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || "barista-knowledge";
const EMBEDDING_MODEL = "text-embedding-3-small";

interface DocPage {
  url: string;
  title: string;
  content: string;
}

const MONDAY_TRADE_DOCS: DocPage[] = [
  {
    url: "https://docs.monday.trade/",
    title: "What is Monday Trade",
    content: `Monday Trade is Monad's native spot and perps DEX that offers the best of CEX and DEX trading experience. Monad's low latency enables Monday Trade to execute trades within milliseconds, ensuring traders can make the most of market moves, without giving up their asset ownership to centralized exchanges.

Monday Trade combines the precision of a fully on-chain order book with the simplicity of AMMs into one sleek UI, delivering gas-efficient, high-performance onchain trades with optional advanced trading tools.

Core Offering: A highly efficient hybrid DEX suitable for beginner, pro, and institutional traders.

Perps: Monday Trade offers perpetuals trading for key pairs initially listed by the Monday Trade core contributors. The scope of the pairs offered will expand over time in line with community requirements.

Spot: Users can seamlessly create liquidity pools or add to existing pools as well as provide liquidity directly in the order book through limit orders.

Our Vision: To offer traders the same experience as trading on centralized exchanges in a fully onchain and decentralized ecosystem with complete control over their assets, enabled by Monad's architecture.`
  },
  {
    url: "https://docs.monday.trade/introduction/what-is-monday-trade/key-features-and-advantages",
    title: "Key Features & Advantages",
    content: `Lightning-Fast Execution: Millisecond settlement times for capturing critical market opportunities.

Hybrid Market Structure: Seamlessly integrates AMM liquidity with a complete onchain order book. This is both for perps and spot, catering to deep liquidity on all markets.

Advanced Trading Tools: Professional-grade interface for sophisticated market participants.

Gas Efficiency: Optimized transaction processing for cost-effective trading.

Permissionless Listings: Enable new token spot markets with minimal liquidity requirements.

Proven Technology: Built on SynFutures' battle-tested infrastructure—creators of Base's leading perpetual DEX with over $300B in trading volume.`
  },
  {
    url: "https://docs.monday.trade/introduction/why-monad",
    title: "Why Monad",
    content: `Decentralization & Performance Without Compromise: As a Monad-native DEX, our mission is to deliver the speed, interactivity, and cost-efficiency users expect from centralized platforms without sacrificing the decentralization and transparency that define DeFi.

Performance that unlocks new UX: Traditional EVM chains are limited by single-threaded execution and consensus-execution coupling. Monad changes the game with:
- 10,000 TPS throughput
- 500ms block times
- 1-second finality

This enables a CEX-like experience with instant trade confirmations, low latency, and negligible transaction costs.

Ethereum compatibility, no tradeoffs: Monad is fully EVM-equivalent and bytecode-compatible. All existing Solidity contracts work out of the box. No changes needed for address formats, signatures, or wallets.

Parallel & pipelined execution: Monad introduces parallel execution and superscalar pipelining. Parallel execution means Monad can run multiple transactions across cores while preserving the exact same serial ordering.

Decentralized, credibly neutral: Monad is designed to preserve decentralization with Proof-of-Stake & pipelined BFT consensus (MonadBFT). Anyone can run a full node with commodity hardware.`
  },
  {
    url: "https://docs.monday.trade/perps-trading/perps-contract-specifications-and-fees",
    title: "Perps Contract Specifications & Fees",
    content: `Monday Trade Perpetual Futures Trading Fees and Specifications:

Available Trading Pairs with Leverage and Margin Requirements:

BTC/USDC: 10x leverage, 10% IMR (Initial Margin Requirement), 5% MMR (Maintenance Margin Requirement), 0.01 USDC execution fee, 0.02% market order fee, 0.00% limit order rebate.

ETH/USDC: 10x leverage, 10% IMR, 5% MMR, 0.01 USDC execution fee, 0.02% market order fee, 0.00% limit order rebate.

MON/USDC: 10x leverage, 10% IMR, 5% MMR, 0.01 USDC execution fee, 0.02% market order fee, 0.00% limit order rebate.

System Contracts (Monad Mainnet):
- Config: 0x15bC3C13cbf5903E78b97208ba1021E5dc1B4470
- Gate: 0x2E32345Bf0592bFf19313831B99900C530D37d90
- Observer: 0xdfBA572929De47838BdE12336dfE8842B06d9628
- Guardian: 0x5FE49fb8770A8009335B1d76496c3e07Ca04FC9F`
  },
  {
    url: "https://docs.monday.trade/perps-trading/perps-protocol-mechanics",
    title: "Perps Protocol Mechanics",
    content: `The Monday Trade Perps Engine: A next-generation derivatives market infrastructure built around a permissionless onchain orderbook. Evolving beyond traditional AMM-based models, it enables active market making through deterministic, transparent, and fully on-chain mechanisms designed for perpetual futures.

Active Liquidity Through Orderbook Market Making: The system allows makers to place native limit orders at discrete price points, which execute atomically once matched—delivering the same precision and control as centralized exchange orderbooks. All matching and settlement occur on-chain, eliminating centralized intermediaries.

Unified Liquidity Model: The Monday Trade Perps Engine unifies concentrated liquidity and limit orders within a single on-chain framework. Range positions cover price ranges with aggregated liquidity. Orders are discrete maker limit orders. Orders are always executed before any Range liquidity is consumed.

Pearl-based Design: Each price point is represented by a Pearl, a data structure that stores both Range and Order information. Pearls are indexed by price and together form the unified liquidity layer of the protocol.

Trade Execution Process:
1. Check active limit orders at the current price
2. If orders exist, consume them until trade is satisfied
3. Locate the next Pearl at subsequent price
4. Execute remaining trade across the liquidity
5. Continue until fully filled

Atomic Execution: Each transaction executes in full or not at all. Takers receive immediate and predictable fills. Makers maintain full transparency.`
  },
  {
    url: "https://docs.monday.trade/perps-trading/perps-liquidation-engine",
    title: "Perps Liquidation Engine",
    content: `Liquidation in Monday Trade: When the margin supporting a trading position falls below its maintenance margin requirement (5% MMR), that position is subject to liquidation.

Taking-Over Approach: The primary liquidation method where the liquidator takes over the target trading position along with the remaining margins and tops up the margin to meet the initial margin requirement (10% IMR). The remaining margin is potential profit for the liquidator if they can manage the risk.

Forced Close Approach: Trading positions failing the maintenance margin requirement are forced to trade against the AMM directly to close the position. Trading fee is charged. Remaining margins after forced close go to the insurance fund.

Partial Liquidation: Both approaches support partial liquidation where the initiator specifies the amount to be taken over or closed. Large bankrupted positions can be handled by multiple liquidators.

Insurance Fund: When a position is bankrupted, the insurance fund is first used to fill the gap. If the insurance fund is not enough, losses are socialized to all opposite positions (profiting positions are taxed to cover the loss).`
  },
  {
    url: "https://docs.monday.trade/perps-trading/perps-funding-rate",
    title: "Perps Funding Rate",
    content: `Funding Rate Mechanism: Monday Trade uses a continuous funding mechanism to keep perpetual futures prices aligned with spot prices.

Formula: FundingFeeRate = ((P_fair - P_spot) / P_spot) × (Δt / Interval)

Funding Intervals: Can be 1 hour, 8 hours, or 24 hours depending on the trading pair.

When Funding is Realized: Funding is exchanged between long and short traders when positions are increased, reduced, closed, or margin is adjusted.

Positive Funding Rate: Longs pay shorts (when perp price > spot price)
Negative Funding Rate: Shorts pay longs (when perp price < spot price)`
  },
  {
    url: "https://docs.monday.trade/spot-trading/spot-protocol-mechanics",
    title: "Spot Trading Protocol Mechanics",
    content: `Monday Trade Spot Trading: A hybrid AMM + Order Book model for optimal liquidity and execution.

How It Works:
1. Order Book provides precise limit order execution
2. AMM pools provide deep passive liquidity
3. Orders fill from the best available source automatically

Benefits:
- Best price execution across both liquidity sources
- Minimal slippage for large orders
- Professional-grade trading tools
- Permissionless pool creation`
  },
  {
    url: "https://docs.monday.trade/spot-trading/spot-protocol-mechanics/spot-fees",
    title: "Spot Trading Fees",
    content: `Monday Trade Spot Trading Fees:

Order Book (Taker) Fee: 0.03%
AMM Pool Fee: 0.3% (standard pools)

Example: Trading 1 WETH where 0.9 WETH fills via order book and 0.1 WETH via AMM:
- Order book portion: 0.9 × 0.03% = 0.00027 WETH
- AMM portion: 0.1 × 0.3% = 0.0003 WETH
- Total fees: 0.00057 WETH

The hybrid model optimizes for lowest total fees by routing through order book first when possible.`
  },
  {
    url: "https://docs.monday.trade/general/voyage-point-program",
    title: "Voyage Point Program",
    content: `Voyage Point Program Overview: A 24-week campaign designed to reward users for providing deep, passive liquidity and trading on Monday Trade. Points are calculated and distributed weekly, with each epoch running from Monday 00:00 UTC to Sunday 23:59 UTC.

What are Voyage Points? Voyage Points measure your contribution to the Monday Trade ecosystem. Points are earned through trading and liquidity provision activities on both Spot and Perp markets.

How to Earn Points:

Spot Market Activities:
- Limit Orders (Maker): Earn points when your spot limit orders are filled
- Liquidity Provision: Supply to Spot AMM pools to earn points
- Market Orders (Taker): Execute spot market orders

Perp Market Activities:
- Limit Orders (Maker): Earn points when your perpetual limit orders are filled
- Liquidity Provision: Supply to Perp AMM pools
- Market Orders (Taker): Execute perpetual market orders
- Position Holding: Maintain open perp positions for bonus multipliers

Consistency Bonus: Trade or provide liquidity for 7 consecutive days to activate a bonus.

Referral: Earn 20% of the Voyage Points generated by users you directly refer.

Market Multipliers:
- Spot MON/USDC pools: 4X
- Spot AUSD/earnAUSD: 3X
- Spot gMON/MON, WBTC/USDC: 2X
- Perp BTC/USDC, ETH/USDC, MON/USDC: 5X`
  },
  {
    url: "https://docs.monday.trade/general/faqs/general",
    title: "General FAQs",
    content: `Frequently Asked Questions - General:

Which wallets are supported?
MetaMask, WalletConnect, Rabby, Phantom, Backpack, HaHa Wallet, and OKX Wallet.

Do I need to KYC?
No. Monday Trade is fully non-custodial and permissionless—no KYC needed.

Can I trade or LP on mobile?
Yes, as long as your mobile wallet supports dApp browsing (like Rabby Mobile, Phantom, or OKX wallet).

What do the "Verified Token" and "Pool with Verified Tokens" badges mean?
These badges help identify tokens and pools that have been reviewed by the team. The badge only indicates the interface correctly recognizes the token—it is NOT an endorsement of the token's value or project legitimacy.`
  },
  {
    url: "https://docs.monday.trade/general/faqs/trading",
    title: "Trading FAQs",
    content: `Frequently Asked Questions - Trading:

What do I need to start trading on Monday Trade?
Just a supported crypto wallet, some assets (like ETH or USDC), and gas tokens (for Monad network). No sign-ups or emails required.

How do I place a trade?
1. Connect your wallet
2. Select the token you want to swap and the one you want to receive
3. Enter the amount and confirm the transaction
4. Approve the token (if first time) and submit the swap

What assets can I trade?
Any tokens supported by Monday Trade on Monad network.

How can I avoid high slippage and price impact?
1. Check Pool Liquidity Before Trading - avoid large trades in low-liquidity pools
2. Use Limit Orders - execute only at your desired price
3. Set Realistic Slippage Tolerance (1-3% for low-liquidity pools)
4. Break Up Large Trades into smaller trades over time
Monday Trade warns you if trade price impact exceeds 3%.`
  },
  {
    url: "https://docs.monday.trade/general/faqs/liquidity-provision",
    title: "Liquidity Provision FAQs",
    content: `Frequently Asked Questions - Liquidity Provision:

How do I provide liquidity?
Connect your wallet, navigate to the Pools section, select a pool, and deposit both tokens in the required ratio.

What is impermanent loss?
Impermanent loss occurs when the price ratio of tokens in a pool changes compared to when you deposited. The greater the price change, the more significant the loss compared to simply holding.

Can I provide single-sided liquidity?
Yes, for concentrated liquidity positions you can provide liquidity at specific price ranges.

How do I earn from LP positions?
You earn a share of trading fees proportional to your liquidity contribution. You also earn Voyage Points during the reward program.`
  },
  {
    url: "https://docs.monday.trade/general/risks-and-security",
    title: "Risks & Security",
    content: `Risk Disclosure for Monday Trade:

Smart Contract Risk: All DeFi protocols carry smart contract risk. Monday Trade is built on battle-tested infrastructure from SynFutures.

Liquidation Risk: Leveraged positions can be liquidated if margin falls below the 5% maintenance requirement.

Market Risk: Cryptocurrency prices are volatile. Only trade with funds you can afford to lose.

Impermanent Loss Risk: Liquidity providers may experience impermanent loss when token prices change.

Security Features:
- Fully non-custodial - you control your private keys
- All trades executed on-chain
- Transparent, auditable smart contracts
- No centralized intermediaries

Best Practices:
- Use appropriate leverage for your risk tolerance
- Set stop-loss orders to limit downside
- Never trade more than you can afford to lose
- Verify you're on the official Monday Trade site`
  },
  {
    url: "https://docs.monday.trade/perps-trading/perps-order-types-and-matching",
    title: "Perps Order Types & Matching",
    content: `Order Types Available on Monday Trade Perps:

Market Orders: Execute immediately at the best available price. Fee: 0.02%.

Limit Orders: Execute at your specified price or better. Fee rebate: 0.00% (makers earn rebate).

Stop-Loss Orders: Automatically close position when price reaches stop level.

Take-Profit Orders: Automatically close position when price reaches profit target.

Order Matching: Orders are matched on a price-time priority basis. Limit orders at the same price are filled in the order they were placed. Market orders execute against the best available liquidity from both limit orders and AMM.

Execution: All order matching and settlement occurs fully on-chain for transparency and trustlessness.`
  },
  {
    url: "https://docs.monday.trade/introduction/how-to-start-trading-on-monday-trade",
    title: "How to Start Trading on Monday Trade",
    content: `Getting Started with Monday Trade:

Step 1: Add Monad Chain to Your Wallet
- Network Name: Monad
- Add Monad network to MetaMask or your preferred wallet

Step 2: Get MON Tokens for Gas
- You'll need MON tokens to pay for transaction fees on Monad network

Step 3: Connect Your Wallet
- Visit app.monday.trade
- Click "Connect Wallet"
- Select your wallet (MetaMask, Rabby, Phantom, etc.)
- Approve the connection

Step 4: Deposit Funds
- Deposit USDC or other supported assets to start trading
- Ensure you have MON for gas fees

Step 5: Start Trading
- Navigate to Spot or Perps section
- Select your trading pair
- Enter order details and confirm

No sign-up, email, or KYC required. Just connect and trade!`
  },
  {
    url: "https://docs.monday.trade/spot-trading/spot-contract-pair-specifications",
    title: "Spot Contract Pair Specifications",
    content: `Monday Trade Spot Trading Pairs:

Currently Available Spot Pairs on Monad:
- MON/USDC (multiple fee tiers: 0.05%, 0.3%)
- WBTC/USDC
- WETH/USDC
- gMON/MON
- AUSD/earnAUSD

Pool Creation: Users can create new liquidity pools for any ERC-20 token pair with minimal requirements.

Fee Tiers: Different pools may have different fee structures (0.03%, 0.05%, 0.3%) depending on asset volatility and liquidity needs.`
  },
  {
    url: "https://docs.monday.trade/spot-trading/how-to-provide-liquidity-on-monday-trade",
    title: "How to Provide Liquidity",
    content: `Providing Liquidity on Monday Trade:

Step 1: Navigate to Pools
- Go to the Pools section from the main menu

Step 2: Select a Pool
- Choose an existing pool or create a new one
- Check the pool's APY and trading volume

Step 3: Provide Liquidity
- Click "Add Liquidity"
- Enter the amount for each token
- Review the price range (for concentrated liquidity)
- Confirm the transaction

Step 4: Manage Your Position
- Monitor your LP position from the Portfolio section
- Track earned fees and Voyage Points
- Adjust or remove liquidity as needed

Tips:
- Start with stablecoin pairs for lower impermanent loss risk
- Consider concentrated liquidity positions for higher capital efficiency
- Monitor your position regularly during volatile markets`
  },
  {
    url: "https://docs.monday.trade/general/glossary",
    title: "Glossary",
    content: `Monday Trade Glossary:

AMM (Automated Market Maker): A decentralized exchange mechanism that uses liquidity pools and mathematical formulas to price assets.

Funding Rate: Periodic payments between long and short traders to keep perpetual prices aligned with spot.

IMR (Initial Margin Requirement): The minimum margin (10%) required to open a leveraged position.

MMR (Maintenance Margin Requirement): The minimum margin (5%) to keep a position open. Below this triggers liquidation.

Leverage: Multiplier for trading exposure. Monday Trade offers up to 10x leverage.

Liquidation: Forced closure of a position when margin falls below MMR.

Pearl: Data structure in Monday Trade representing liquidity at each price point.

Perpetual Futures (Perps): Derivative contracts with no expiry date that track an underlying asset's price.

Slippage: Difference between expected and executed price.

Taker: Trader who executes against existing liquidity (pays fees).

Maker: Trader who provides liquidity via limit orders (earns rebates).`
  },
];

function chunkContent(content: string, maxChunkSize: number = 800): string[] {
  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function generateEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function ingestDocs() {
  console.log("[START] Monday Trade documentation ingestion...\n");

  if (!process.env.PINECONE_API_KEY) {
    console.error("[ERROR] PINECONE_API_KEY is required");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("[ERROR] OPENAI_API_KEY is required for embeddings");
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const index = pinecone.Index(PINECONE_INDEX_NAME);

  let totalChunks = 0;
  const allVectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string>;
  }> = [];

  for (const doc of MONDAY_TRADE_DOCS) {
    console.log(`📄 Processing: ${doc.title}`);
    const chunks = chunkContent(doc.content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${doc.title.toLowerCase().replace(/\s+/g, "-")}-chunk-${i}`;
      
      try {
        const embedding = await generateEmbedding(
          `${doc.title}\n\n${chunk}`,
          openai
        );

        allVectors.push({
          id: chunkId,
          values: embedding,
          metadata: {
            title: doc.title,
            url: doc.url,
            content: chunk,
            chunkIndex: String(i),
          },
        });

        totalChunks++;
        process.stdout.write(`  [OK] Chunk ${i + 1}/${chunks.length}\r`);
      } catch (error) {
        console.error(`  [ERROR] Failed to embed chunk ${i}:`, error);
      }
    }
    console.log(`  [OK] ${chunks.length} chunks processed`);
  }

  console.log(`\n[UPLOAD] Upserting ${allVectors.length} vectors to Pinecone...`);
  
  const batchSize = 100;
  for (let i = 0; i < allVectors.length; i += batchSize) {
    const batch = allVectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allVectors.length / batchSize)} upserted`);
  }

  const stats = await index.describeIndexStats();
  console.log(`\n[DONE] Ingestion complete!`);
  console.log(`   Total documents: ${MONDAY_TRADE_DOCS.length}`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   Pinecone vectors: ${stats.totalRecordCount || 0}`);
}

ingestDocs().catch(console.error);
