import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      return null;
    }
  }

  return null;
}

const CACHE_TTL = 60 * 60; // 1 hour in seconds
const CACHE_PREFIX = "barista:";

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const cached = await client.get<T>(`${CACHE_PREFIX}${key}`);
    return cached;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = CACHE_TTL): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(`${CACHE_PREFIX}${key}`, value, { ex: ttl });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

export async function getCachedResponse(query: string): Promise<string | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `response:${Buffer.from(normalizedQuery).toString("base64")}`;
  return getCached<string>(cacheKey);
}

export async function setCachedResponse(query: string, response: string): Promise<void> {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `response:${Buffer.from(normalizedQuery).toString("base64")}`;
  await setCache(cacheKey, response, CACHE_TTL);
}

export async function healthCheck(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
