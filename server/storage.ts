import { randomUUID } from "crypto";
import type { InsertChatMessage, ChatMessage } from "@shared/schema";

export interface IStorage {
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  updateMessageFeedback(messageId: string, feedback: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: Map<string, ChatMessage>;

  constructor() {
    this.messages = new Map();
  }

  async saveChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateMessageFeedback(messageId: string, feedback: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.feedback = feedback;
      this.messages.set(messageId, message);
    }
  }
}

export const storage = new MemStorage();
