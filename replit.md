# Barista - Monday Trade AI Assistant

## Overview
Barista is an AI-powered chat assistant for Monday Trade, a decentralized perpetual futures trading platform on Monad blockchain. The assistant uses Grok AI (xAI) for natural language processing with RAG (Retrieval-Augmented Generation) for accurate answers about Monday Trade's features. Human support requests are redirected to Discord.

## Current State
**Version 2.0 - Delta Neutral Funding Rate Monitor**
- Full-stack chat widget with Grok AI integration
- **Delta neutral strategy monitor** - polls MON/USDC funding rate from Monday Trade API, alerts users when conditions are favorable
- **Live X/Twitter search** using official xAI SDK with grok-4-1-fast model
- **Funding rate indicator** on chat bubble (green glow when funding is positive)
- Purple Monday Trade branding theme matching app.monday.trade
- System theme preference (auto dark/light mode based on OS)
- Animated chat window with smooth open/close transitions
- Two-column landing page with hero section and chat preview
- Comprehensive RAG with 15+ manual knowledge entries covering all docs.monday.trade content plus delta neutral strategy
- Custom anime character avatar
- Redis caching for common queries
- Human support redirected to Discord (https://discord.com/invite/mondaytrade)
- Inline citations from real-time X posts

## Architecture

### Frontend (React + Vite)
- **Components**: Located in `client/src/components/barista/`
  - `BaristaChat.tsx` - Main chat container with state management, funding status polling, and Discord redirect
  - `BaristaAvatar.tsx` - Animated coffee cup SVG with steam
  - `ChatWindow.tsx` - Chat window with header, messages, input
  - `ChatInput.tsx` - Text input with send button
  - `Message.tsx` - Message bubbles with formatting, shows "Funding Rate" tool indicator
  - `FloatingChatBubble.tsx` - Coffee brown floating button with sparkle + green funding indicator
  - `SuggestionPill.tsx` - Quick action pills (includes "Delta neutral strategy?" and "Funding rate?")
  - `TypingIndicator.tsx` - Animated loading state
  - `SourceCitations.tsx` - Source links display
  - `FeedbackButtons.tsx` - Thumbs up/down
  - `ThemeToggle.tsx` - Dark/light mode toggle

### Backend (Express + TypeScript)
- **Services**: Located in `server/services/`
  - `grok.ts` - Grok AI integration (grok-3 for chat, grok-4-1-fast for live search via Python subprocess). Detects funding/delta-neutral queries and injects live data.
  - `vectorStore.ts` - Pinecone RAG with manual knowledge (15+ entries including delta neutral strategy)
  - `cache.ts` - Redis/Upstash caching
  - `mondayApi.ts` - Monday Trade developer API client with HMAC-SHA256 authentication. Fetches funding rate history.
  - `fundingMonitor.ts` - Polls MON/USDC funding rate every 5 minutes, calculates annualized yield, determines if delta neutral is favorable.
- **Scripts**: Located in `server/scripts/`
  - `xai_search.py` - Live X/Twitter and web search using official xai-sdk with Agent Tools API

### API Endpoints

**Chat Endpoints:**
- `POST /api/chat` - Standard chat endpoint
- `POST /api/chat/stream` - SSE streaming endpoint
- `GET /api/chat/suggestions` - Suggestion pills
- `POST /api/chat/feedback` - Submit message feedback
- `GET /api/health` - Health check (includes mondayApi and fundingMonitor status)

**Funding Endpoints:**
- `GET /api/funding/status` - Current funding rate, favorable signal, projected APR, last-updated timestamp

## Key Features
1. **Barista Personality** - Friendly, coffee-themed AI assistant
2. **RAG Context** - Manual knowledge entries for accurate answers
3. **Source Citations** - Links to documentation and @MondayTrade_ for live updates
4. **Feedback System** - Thumbs up/down on responses
5. **Caching** - Redis caching for common queries (optional)
6. **Dark/Light Theme** - System theme preference (auto dark/light mode)
7. **Discord Support** - Human support requests redirect to Monday Trade Discord
8. **Delta Neutral Monitor** - Polls funding rate, injects live data into AI responses, shows visual indicator on chat bubble
9. **Live X Search** - Real-time X/Twitter search for time-sensitive queries

## Environment Variables Required
- `XAI_API_KEY` - Grok API key (powers both chat and live search)
- `MONDAY_API_KEY` - Monday Trade developer API key (for funding rate monitoring)
- `MONDAY_API_SECRET` - Monday Trade developer API secret (for funding rate monitoring)
- `PINECONE_API_KEY` - Pinecone vector DB (optional, uses manual knowledge if not set)
- `PINECONE_INDEX` - Index name (barista-knowledge)
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token

### How to Get Monday Trade API Credentials
1. Create a wallet on Monad blockchain (MetaMask, Rabby, or similar EVM wallet)
2. Call `POST https://api.monday.trade/v4/public/trader/api-key/create` with your wallet signature
3. The request body requires: chainID (143), address (your wallet, lowercase), signature (signed auth message), nonce, timestamp
4. The auth message format: "Chain ID: {chainID}\nWallet Address: {address}\nNonce: {nonce}\nTimestamp: {timestamp}\nSign this message to authenticate with Monday Trade API."
5. Store the returned `apiKey` as `MONDAY_API_KEY` and `apiSecret` as `MONDAY_API_SECRET` in environment secrets
6. The apiSecret is shown only once -- store it securely

## Recent Changes
- **Mar 25, 2026**: Added delta neutral funding rate monitor -- new backend services (mondayApi.ts, fundingMonitor.ts), `/api/funding/status` endpoint, funding rate injection into Grok chat context, green funding indicator on chat bubble, knowledge base entry for delta neutral strategy
- **Mar 25, 2026**: Removed live support system -- redirected human support requests to Discord
- **Feb 5, 2026**: Updated footer links - Docs to Blog, Trade Now to Discord, tagline to "Your All in One DEX"
- **Feb 5, 2026**: Fixed live search trigger detection - expanded keywords to include time-sensitive topics
- **Feb 4, 2026**: Re-enabled live X search using official xai-sdk Python package with grok-4-1-fast model
- **Feb 4, 2026**: Updated to grok-3 model for standard chat (grok-2-1212 deprecated)
- **Jan 15, 2026**: Expanded knowledge base, custom avatar, purple theme, UI redesign
- **Jan 2026**: Initial MVP with Grok AI, RAG, and chat UI

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js, TypeScript, Python 3.11 (for xAI Agent Tools)
- **AI**: Grok API (grok-3 model with RAG knowledge base)
- **Trading API**: Monday Trade developer API (https://developers.monday.trade/)
- **Vector DB**: Pinecone
- **Cache**: Upstash Redis (optional)

## Design System
- Primary Color: Purple (#9945FF / hue 273)
- Background Dark: Deep blue-black (hue 250 30% 6%)
- Cards Dark: Dark blue-gray (hue 250 30% 9%)
- Success Green: #14F195 (for indicators, funding favorable)
- System theme default (follows OS preference)
- Inter font family
- Rounded corners (rounded-2xl for chat elements)
- Animated steam particles on avatar with purple tint
- Purple glow effects with spring animations
- No emojis in any UI text or AI responses
