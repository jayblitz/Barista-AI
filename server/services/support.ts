import { v4 as uuidv4 } from 'uuid';
import { sendSupportNotification } from './email';

export interface SupportThread {
  id: string;
  userAddress: string;
  agentAddress?: string;
  status: 'pending' | 'active' | 'resolved';
  createdAt: Date;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  threadId: string;
  sender: 'user' | 'agent' | 'system';
  senderAddress?: string;
  content: string;
  timestamp: Date;
}

// In-memory storage for support threads (MVP - can upgrade to DB later)
const threads: Map<string, SupportThread> = new Map();

// Support wallet address - agents must connect with this wallet to see threads
export const SUPPORT_WALLET_ADDRESS = process.env.SUPPORT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

export async function createSupportThread(
  userAddress: string,
  initialMessage: string,
  chatHistory?: { role: string; content: string }[]
): Promise<SupportThread> {
  const threadId = uuidv4();
  
  const systemMessage: SupportMessage = {
    id: uuidv4(),
    threadId,
    sender: 'system',
    content: `User escalated from Barista AI. Chat history:\n${chatHistory?.map(m => `${m.role}: ${m.content}`).join('\n') || 'No history available'}`,
    timestamp: new Date(),
  };

  const userMessage: SupportMessage = {
    id: uuidv4(),
    threadId,
    sender: 'user',
    senderAddress: userAddress,
    content: initialMessage,
    timestamp: new Date(),
  };

  const thread: SupportThread = {
    id: threadId,
    userAddress,
    status: 'pending',
    createdAt: new Date(),
    messages: [systemMessage, userMessage],
  };

  threads.set(threadId, thread);
  
  // Send email notification
  await sendSupportNotification(userAddress, initialMessage, threadId);
  
  console.log(`[OK] Created support thread ${threadId} for ${userAddress}`);
  
  return thread;
}

export function getThread(threadId: string): SupportThread | undefined {
  return threads.get(threadId);
}

export function getAllThreads(): SupportThread[] {
  return Array.from(threads.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function getPendingThreads(): SupportThread[] {
  return getAllThreads().filter(t => t.status === 'pending');
}

export function addMessage(
  threadId: string,
  sender: 'user' | 'agent',
  senderAddress: string,
  content: string
): SupportMessage | null {
  const thread = threads.get(threadId);
  if (!thread) return null;

  const message: SupportMessage = {
    id: uuidv4(),
    threadId,
    sender,
    senderAddress,
    content,
    timestamp: new Date(),
  };

  thread.messages.push(message);
  
  // Mark as active if agent responds
  if (sender === 'agent' && thread.status === 'pending') {
    thread.status = 'active';
    thread.agentAddress = senderAddress;
  }

  return message;
}

export function resolveThread(threadId: string): boolean {
  const thread = threads.get(threadId);
  if (!thread) return false;
  
  thread.status = 'resolved';
  return true;
}

export function getThreadsForUser(userAddress: string): SupportThread[] {
  return getAllThreads().filter(t => t.userAddress === userAddress);
}
