# Barista - Monday Trade AI Assistant

## Overview
Barista is an AI-powered chat assistant for Monday Trade, a decentralized perpetual futures trading platform on Monad blockchain. The assistant uses Grok AI (xAI) for natural language processing with RAG (Retrieval-Augmented Generation) for accurate answers about Monday Trade's features.

## Current State
**Version 1.2 - Purple Theme + Animations**
- Full-stack chat widget with Grok AI integration
- Purple Monday Trade branding theme matching app.monday.trade
- System theme preference (auto dark/light mode based on OS)
- Animated chat window with smooth open/close transitions
- Two-column landing page with hero section and chat preview
- RAG with manual knowledge entries
- Redis caching for common queries
- Beautiful animated Barista avatar with purple accent

## Architecture

### Frontend (React + Vite)
- **Components**: Located in `client/src/components/barista/`
  - `BaristaChat.tsx` - Main chat container with state management
  - `BaristaAvatar.tsx` - Animated coffee cup SVG with steam
  - `ChatWindow.tsx` - Chat window with header, messages, input
  - `ChatInput.tsx` - Text input with send button
  - `Message.tsx` - Message bubbles with formatting
  - `FloatingChatBubble.tsx` - Coffee brown floating button with sparkle
  - `SuggestionPill.tsx` - Quick action pills
  - `TypingIndicator.tsx` - Animated loading state
  - `SourceCitations.tsx` - Source links display
  - `FeedbackButtons.tsx` - Thumbs up/down
  - `ThemeToggle.tsx` - Dark/light mode toggle

### Backend (Express + TypeScript)
- **Services**: Located in `server/services/`
  - `grok.ts` - Grok AI integration via OpenAI SDK
  - `vectorStore.ts` - Pinecone RAG with manual knowledge
  - `cache.ts` - Redis/Upstash caching
  - `mondayApi.ts` - Monday Trade API client (HMAC auth)

### API Endpoints
- `POST /api/chat` - Standard chat endpoint
- `POST /api/chat/stream` - SSE streaming endpoint
- `GET /api/chat/suggestions` - Suggestion pills
- `POST /api/chat/feedback` - Submit message feedback
- `GET /api/health` - Health check

## Key Features
1. **Barista Personality** - Friendly, coffee-themed AI assistant
2. **RAG Context** - Manual knowledge entries for accurate answers
3. **Tool Indicators** - Shows when AI is searching docs/web
4. **Source Citations** - Links to documentation used
5. **Feedback System** - Thumbs up/down on responses
6. **Caching** - Redis caching for common queries
7. **Dark/Light Theme** - Toggle between modes

## Environment Variables Required
- `XAI_API_KEY` - Grok API key
- `PINECONE_API_KEY` - Pinecone vector DB
- `PINECONE_INDEX` - Index name (barista-knowledge)
- `OPENAI_API_KEY` - For embeddings
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token
- `MONDAY_API_KEY` - Monday Trade API
- `MONDAY_SECRET_KEY` - HMAC secret
- `MONDAY_PASSPHRASE` - API passphrase
- `MONDAY_API_URL` - API base URL

## Recent Changes
- **Jan 15, 2026**: Purple theme matching app.monday.trade, system theme preference, chat box animations
- **Jan 15, 2026**: UI redesign - New landing page with hero + chat preview
- **Jan 2026**: Upgraded to Grok-3-latest model with web_search and x_search tools
- **Jan 2026**: Initial MVP with Grok AI, RAG, and chat UI

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js, TypeScript
- **AI**: Grok API (grok-2-1212 model)
- **Vector DB**: Pinecone
- **Cache**: Upstash Redis

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
