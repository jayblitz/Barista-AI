# Barista - Monday Trade AI Assistant

## Overview
Barista is an AI-powered chat assistant for Monday Trade, a decentralized perpetual futures trading platform on Monad blockchain. The assistant uses Grok AI (xAI) for natural language processing with RAG (Retrieval-Augmented Generation) for accurate answers about Monday Trade's features. Users can escalate to live human support when needed.

## Current State
**Version 1.5 - Live X Search with xAI Agent Tools**
- Full-stack chat widget with Grok AI integration
- **Live X/Twitter search** using official xAI SDK with grok-4-1-fast model
- **Two-way live support escalation system** with agent dashboard
- Purple Monday Trade branding theme matching app.monday.trade
- System theme preference (auto dark/light mode based on OS)
- Animated chat window with smooth open/close transitions
- Two-column landing page with hero section and chat preview
- Comprehensive RAG with 14+ manual knowledge entries covering all docs.monday.trade content
- Custom anime character avatar (attached_assets/2026-01-15_07.08.55_1768460960171.jpg)
- Redis caching for common queries
- Email notifications via Resend for new support threads
- Documentation ingestion script for Pinecone updates
- Inline citations from real-time X posts

## Architecture

### Frontend (React + Vite)
- **Components**: Located in `client/src/components/barista/`
  - `BaristaChat.tsx` - Main chat container with state management and escalation logic
  - `BaristaAvatar.tsx` - Animated coffee cup SVG with steam
  - `ChatWindow.tsx` - Chat window with header, messages, input; conditionally shows LiveSupportChat
  - `ChatInput.tsx` - Text input with send button
  - `Message.tsx` - Message bubbles with formatting
  - `FloatingChatBubble.tsx` - Coffee brown floating button with sparkle
  - `SuggestionPill.tsx` - Quick action pills
  - `TypingIndicator.tsx` - Animated loading state
  - `SourceCitations.tsx` - Source links display
  - `FeedbackButtons.tsx` - Thumbs up/down
  - `ThemeToggle.tsx` - Dark/light mode toggle
  - `LiveSupportChat.tsx` - Real-time live support messaging interface

- **Pages**: Located in `client/src/pages/`
  - `agent.tsx` - Agent dashboard for support team to view and respond to threads

### Backend (Express + TypeScript)
- **Services**: Located in `server/services/`
  - `grok.ts` - Grok AI integration (grok-3 for chat, grok-4-1-fast for live search via Python subprocess)
  - `vectorStore.ts` - Pinecone RAG with manual knowledge
  - `cache.ts` - Redis/Upstash caching
  - `support.ts` - Support thread management (create, read, message, resolve)
  - `email.ts` - Email notifications via Resend
- **Scripts**: Located in `server/scripts/`
  - `xai_search.py` - Live X/Twitter and web search using official xai-sdk with Agent Tools API

### API Endpoints

**Chat Endpoints:**
- `POST /api/chat` - Standard chat endpoint
- `POST /api/chat/stream` - SSE streaming endpoint
- `GET /api/chat/suggestions` - Suggestion pills
- `POST /api/chat/feedback` - Submit message feedback
- `GET /api/health` - Health check

**Support Endpoints:**
- `POST /api/support/threads` - Create new support thread (triggers email notification)
- `GET /api/support/threads` - List threads (requires x-agent-address header)
- `GET /api/support/threads/:threadId` - Get thread with messages
- `POST /api/support/threads/:threadId/messages` - Add message to thread
- `POST /api/support/threads/:threadId/resolve` - Mark thread as resolved
- `GET /api/support/config` - Get support configuration (wallet address, email status)

## Key Features
1. **Barista Personality** - Friendly, coffee-themed AI assistant
2. **RAG Context** - Manual knowledge entries for accurate answers
3. **Source Citations** - Links to documentation and @MondayTrade_ for live updates
4. **Feedback System** - Thumbs up/down on responses
5. **Caching** - Redis caching for common queries (optional)
6. **Dark/Light Theme** - System theme preference (auto dark/light mode)
7. **Live Support Escalation** - Users can escalate to human support via "Talk to Human" button
8. **Agent Dashboard** - Support team can view and respond to escalated threads at /agent
9. **Email Notifications** - New support threads trigger email alerts via Resend

## Environment Variables Required
- `XAI_API_KEY` - Grok API key (powers both chat and live search)
- `PINECONE_API_KEY` - Pinecone vector DB (optional, uses manual knowledge if not set)
- `PINECONE_INDEX` - Index name (barista-knowledge)
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token
- `RESEND_API_KEY` - Resend email service for support notifications

Note: OpenAI API key is no longer required - the app uses Grok for all AI features and manual knowledge for RAG.

## Recent Changes
- **Feb 5, 2026**: Updated footer links - Docs to Blog, Trade Now to Discord, tagline to "Your All in One DEX"
- **Feb 5, 2026**: Fixed live search trigger detection - expanded keywords to include time-sensitive topics (campaign, tvl, airdrop, promotion, etc.) with word-boundary matching to avoid false positives
- **Feb 4, 2026**: Re-enabled live X search using official xai-sdk Python package with grok-4-1-fast model and Agent Tools API (x_search, web_search). Auto-triggers on queries containing "latest", "news", "tweets", "updates", etc.
- **Feb 4, 2026**: Added live support escalation system with agent dashboard, email notifications, and two-way messaging
- **Feb 4, 2026**: Updated to grok-3 model for standard chat (grok-2-1212 deprecated)
- **Jan 15, 2026**: Fixed live search - switched from invalid tool types to xAI's `search_parameters` API for real-time X/Twitter and web search
- **Jan 15, 2026**: Expanded knowledge base with 14+ entries covering all docs.monday.trade content (fees, leverage, margin, liquidation, voyage points, wallets, trading pairs, etc.)
- **Jan 15, 2026**: Created documentation ingestion script (server/scripts/ingestDocs.ts) for Pinecone updates
- **Jan 15, 2026**: Custom anime character avatar replacing animated coffee cup
- **Jan 15, 2026**: Purple theme matching app.monday.trade, system theme preference, chat box animations
- **Jan 15, 2026**: UI redesign - New landing page with hero + chat preview
- **Jan 2026**: Upgraded to Grok-3-latest model with search_parameters live search
- **Jan 2026**: Initial MVP with Grok AI, RAG, and chat UI

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js, TypeScript, Python 3.11 (for xAI Agent Tools)
- **AI**: Grok API (grok-3 model with RAG knowledge base)
- **Vector DB**: Pinecone
- **Cache**: Upstash Redis (optional)

## Design System
- Primary Color: Purple (#9945FF / hue 273)
- Background Dark: Deep blue-black (hue 250 30% 6%)
- Cards Dark: Dark blue-gray (hue 250 30% 9%)
- Success Green: #14F195 (for indicators)
- System theme default (follows OS preference)
- Inter font family
- Rounded corners (rounded-2xl for chat elements)
- Animated steam particles on avatar with purple tint
- Purple glow effects with spring animations
