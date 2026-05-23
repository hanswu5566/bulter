import Redis from "ioredis";

async function flush() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  console.log("Connecting to Redis at:", redisUrl);
  const redis = new Redis(redisUrl);
  try {
    const result = await redis.flushall();
    console.log("Redis Flush Result:", result); // Should output OK
  } catch (err) {
    console.error("Redis flush failed:", err);
  } finally {
    redis.disconnect();
  }
}

flush();
