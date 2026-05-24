import { db } from "@/lib/db";

export const SAAS_LIMITS = {
  DAILY_MAX_TOKENS: 150
};

export const TOKEN_COSTS: Record<string, number> = {
  LISTING_ANALYZE: 20,  // Scrapes, optimizes GCS cover, runs Gemini Vision + Standard (Heavyweight)
  AI_LEASE: 30          // Generates official A4 rent contract (Premium Value)
};

/**
 * Failsafe Taiwan Midnight (GMT+8) Date Calculator.
 * Automatically maps calendar dates to TPE time zone and back-calculates UTC 
 * bounds safely regardless of server/client OS timezones.
 */
export function getTaiwanMidnight(): Date {
  const now = new Date();
  const utcTime = now.getTime();
  
  // Shift to Taiwan time zone (GMT+8)
  const twTime = new Date(utcTime + (8 * 3600000));
  
  // Set to exactly 00:00:00 in Taiwan time zone
  twTime.setUTCHours(0, 0, 0, 0);
  
  // Back-calculate to UTC timestamp for PostgreSQL querying
  return new Date(twTime.getTime() - (8 * 3600000));
}

/**
 * Audits today's consumed tokens, and verifies if the user has enough credit to execute the action.
 * Does NOT write to the database (safe for initial checks!).
 */
export async function checkQuotaOnly(
  userId: string,
  action: string
): Promise<{ allowed: boolean; used: number; max: number; cost: number }> {
  const twMidnight = getTaiwanMidnight();

  const cost = TOKEN_COSTS[action] || 0;

  // 1. Query all consumed logs since Taiwan midnight
  const entries = await db.rateLimit.findMany({
    where: {
      identifier: userId,
      timestamp: { gte: twMidnight }
    },
    select: { action: true }
  });

  // 2. Compute total used tokens today
  const currentUsed = entries.reduce((sum, e) => sum + (TOKEN_COSTS[e.action] || 0), 0);

  const allowed = (currentUsed + cost) <= SAAS_LIMITS.DAILY_MAX_TOKENS;

  return { allowed, used: currentUsed, max: SAAS_LIMITS.DAILY_MAX_TOKENS, cost };
}

/**
 * Logs token consumption inside PostgreSQL atomically.
 */
export async function consumeTokens(userId: string, action: string): Promise<void> {
  await db.rateLimit.create({
    data: {
      identifier: userId,
      action: action
    }
  });
}
