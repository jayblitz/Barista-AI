# Barista - AI-Powered Support Assistant for Monday Trade

## What is Barista?

Barista is an intelligent chat assistant designed specifically for Monday Trade, Monad's native spot and perpetual futures DEX. It combines advanced AI capabilities with human support escalation to provide users with immediate, accurate answers about the platform while ensuring complex issues can be handled by real support agents.

## Core Capabilities

### AI-Powered Chat

Barista uses Grok AI (xAI) to understand and respond to user questions naturally. The assistant is trained on Monday Trade's complete documentation and can answer questions about:

- **Trading Features**: Perpetual futures, spot trading, leverage (up to 10x), margin requirements
- **Fees and Costs**: Trading fees (0.02% maker, 0.05% taker), funding rates, liquidation penalties
- **Platform Mechanics**: Order types, position management, collateral requirements
- **Voyage Points Program**: How to earn points, point multipliers, resting order rewards
- **Wallet Integration**: Supported wallets (MetaMask, Rabby, Coinbase, WalletConnect)
- **Trading Pairs**: Available markets including BTC, ETH, SOL, DOGE, PEPE, WIF, and MON perpetuals

### Real-Time Information

Barista can fetch live updates from X/Twitter when users ask about:
- Latest news and announcements from @MondayTrade_
- Current campaigns, promotions, and airdrops
- TVL updates and platform metrics
- Partnership announcements
- Recent community updates

The assistant automatically detects when a query needs real-time information and searches X/Twitter to provide the most current answer with inline citations linking directly to the source posts.

### Knowledge Base (RAG)

Barista uses Retrieval-Augmented Generation to pull accurate information from Monday Trade's documentation. This ensures responses are factually correct and up-to-date with the platform's actual features and policies.

## Live Support Escalation

When AI alone cannot resolve an issue, users can escalate to human support:

### For Users
- Click "Talk to Human" in the chat interface
- Provide a brief description of the issue
- Continue the conversation in real-time with a support agent
- Receive notifications when agents respond

### For Support Agents
- Access the agent dashboard at `/agent`
- View all open support threads
- Respond to user inquiries in real-time
- Mark threads as resolved when complete
- Receive email notifications for new support requests

## Key Features

### Instant Responses
Get answers in seconds without waiting for human support for common questions about trading, fees, or platform features.

### Source Citations
Every response includes links to official documentation or X/Twitter posts, allowing users to verify information and learn more.

### Feedback System
Users can rate responses with thumbs up/down, helping improve the assistant over time.

### Dark/Light Theme
Automatically matches your system preferences for comfortable viewing at any time of day.

### Mobile-Friendly
The chat widget works seamlessly on desktop and mobile devices.

### Session Continuity
Conversations are maintained throughout your session, allowing for follow-up questions and context-aware responses.

## How It Works

1. **User asks a question** - Type any question about Monday Trade in the chat widget
2. **AI processes the query** - Barista analyzes the question and determines the best way to answer
3. **Knowledge retrieval** - The assistant pulls relevant information from the documentation
4. **Real-time search** (if needed) - For time-sensitive topics, Barista searches X/Twitter for the latest updates
5. **Response generation** - A clear, concise answer is generated with source citations
6. **Human escalation** (if needed) - Complex issues can be escalated to live support agents

## Example Questions Barista Can Answer

- "What are the trading fees on Monday Trade?"
- "How does leverage work for perpetual futures?"
- "What wallets can I use to connect?"
- "How do I earn Voyage Points?"
- "What happens if I get liquidated?"
- "What's the latest news from Monday Trade?"
- "Are there any current promotions or campaigns?"
- "What trading pairs are available?"
- "How does the funding rate work?"

## Technology Stack

- **AI Model**: Grok-3 (xAI) for conversational responses
- **Live Search**: Grok-4-1-fast with xAI Agent Tools for real-time X/Twitter search
- **Knowledge Base**: Pinecone vector database with Monday Trade documentation
- **Caching**: Redis for faster response times on common queries
- **Email Notifications**: Resend for support thread alerts

## Design

Barista features Monday Trade's signature purple theme (#9945FF) with a clean, modern interface that matches the main trading platform at app.monday.trade. The chat widget appears as a floating button in the corner of the page, expanding into a full conversation window when clicked.

---

Barista is designed to be the first line of support for Monday Trade users, providing instant, accurate answers while seamlessly connecting users to human support when needed. It combines the efficiency of AI with the reliability of human expertise to deliver the best possible support experience.
