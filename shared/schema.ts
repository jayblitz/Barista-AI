import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Chat message schema for database persistence (future use)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Citation[]>().default([]),
  toolsUsed: jsonb("tools_used").$type<ToolsUsed>().default({}),
  feedback: text("feedback"), // 'positive' | 'negative' | null
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// TypeScript interfaces for API communication
export interface Citation {
  title: string;
  url: string;
  type: 'docs' | 'x' | 'web';
}

export interface ToolsUsed {
  web_search?: number;
  x_search?: number;
  rag?: number;
}

export interface ChatRequest {
  message: string;
  history?: MessageHistory[];
  sessionId?: string;
}

export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  citations: Citation[];
  toolsUsed: ToolsUsed;
  sessionId: string;
}

export interface SuggestionPill {
  text: string;
  emoji?: string;
}

export interface MarketData {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
}

// Frontend message type for UI
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  toolsUsed?: ToolsUsed;
  feedback?: 'positive' | 'negative' | null;
  isStreaming?: boolean;
  timestamp: Date;
}

// Validation schemas
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  sessionId: z.string().optional(),
});

export const feedbackSchema = z.object({
  messageId: z.string(),
  feedback: z.enum(['positive', 'negative']),
});
