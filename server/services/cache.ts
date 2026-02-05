import { Redis } from "@upstash/redis";

const CACHE_TTL = 3600;
const CACHE_PREFIX = "barista:chat:";

let redisClient: Redis | null = null;
let redisDisabled = false;
let connectionErrorLogged = false;

function getRedisClient(): Redis | null {
  if (redisDisabled) {
    return null;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!connectionErrorLogged) {
      console.log("[INFO] Redis cache not configured - caching disabled");
      connectionErrorLogged = true;
    }
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log("[OK] Redis cache initialized");
    } catch (error) {
      console.error("[ERROR] Failed to initialize Redis:", error);
      redisDisabled = true;
      return null;
    }
  }

  return redisClient;
}

function handleCacheError(operation: string, error: unknown): void {
  if (!connectionErrorLogged) {
    console.error(`[ERROR] Redis ${operation} failed - disabling cache:`, error);
    connectionErrorLogged = true;
  }
  redisDisabled = true;
  redisClient = null;
}

function generateCacheKey(message: string): string {
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
  
  return `${CACHE_PREFIX}${normalized.substring(0, 100)}`;
}

export async function getCachedResponse(message: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const key = generateCacheKey(message);
    const cached = await redis.get<string>(key);
    
    if (cached) {
      console.log(`[CACHE HIT] "${message.substring(0, 30)}..."`);
      return cached;
    }
    
    return null;
  } catch (error) {
    handleCacheError("get", error);
    return null;
  }
}

export async function setCachedResponse(
  message: string,
  response: string
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const key = generateCacheKey(message);
    await redis.set(key, response, { ex: CACHE_TTL });
    console.log(`[CACHE SET] "${message.substring(0, 30)}..."`);
  } catch (error) {
    handleCacheError("set", error);
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(`${CACHE_PREFIX}${key}`);
    return cached;
  } catch (error) {
    handleCacheError("get", error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = CACHE_TTL): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(`${CACHE_PREFIX}${key}`, value, { ex: ttl });
  } catch (error) {
    handleCacheError("set", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    handleCacheError("delete", error);
  }
}

export async function healthCheck(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch (error) {
    handleCacheError("health check", error);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
