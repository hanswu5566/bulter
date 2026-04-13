import { redis } from "./redis";

/**
 * Checks if the identifier (user ID or IP) has exceeded the limit within the window using Redis.
 * This is significantly faster and more scalable than DB-based rate limiting.
 * 
 * @param identifier The user ID or IP address.
 * @param action The action name (e.g., "AI_CHAT").
 * @param limit The maximum number of requests allowed.
 * @param windowInSeconds The window duration in seconds.
 * @returns {Promise<{ success: boolean; remaining: number; reset: Date }>}
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowInSeconds: number
) {
  const key = `ratelimit:${action}:${identifier}`;
  
  // Atomic increment and TTL setting using Redis pipeline or Lua script
  // We use a multi-command for consistency
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.ttl(key);
  
  const results = await pipeline.exec();
  if (!results) throw new Error("Redis pipeline failed");

  const currentCount = (results[0][1] as number);
  const currentTtl = (results[1][1] as number);

  // If this is the first request in the window, set the expiry
  if (currentCount === 1 || currentTtl === -1) {
    await redis.expire(key, windowInSeconds);
  }

  const success = currentCount <= limit;
  const remaining = Math.max(0, limit - currentCount);
  const reset = new Date(Date.now() + (currentTtl > 0 ? currentTtl : windowInSeconds) * 1000);

  return {
    success,
    remaining,
    reset,
  };
}

/**
 * Gets the current daily usage for a user.
 */
export async function getDailyUsage(userId: string): Promise<number> {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const key = `butler:quota:v1:${userId}:${dateStr}`;
  const usage = await redis.get(key);
  return usage ? parseInt(usage, 10) : 0;
}

/**
 * Increments the daily usage for a user. Sets 24h expiry if new.
 */
export async function incrementDailyUsage(userId: string) {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const key = `butler:quota:v1:${userId}:${dateStr}`;
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 86400); // 24 hours
  await pipeline.exec();
}
