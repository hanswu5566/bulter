import { db } from "@/lib/db";

export const SAAS_LIMITS = {
  DAILY_MAX_TOKENS: 150
};

export const TOKEN_COSTS: Record<string, number> = {
  LISTING_ANALYZE: 20,  // Scrapes, optimizes GCS cover, runs Gemini Vision + Standard (Heavyweight)
  AI_LEASE: 30          // Generates official A4 rent contract (Premium Value)
};

/**
 * Audits today's consumed tokens, and verifies if the user has enough credit to execute the action.
 * Does NOT write to the database (safe for initial checks!).
 */
export async function checkQuotaOnly(
  userId: string,
  action: string
): Promise<{ allowed: boolean; used: number; max: number; cost: number }> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const cost = TOKEN_COSTS[action] || 0;

  // 1. Query all consumed logs for today
  const entries = await db.rateLimit.findMany({
    where: {
      identifier: userId,
      timestamp: { gte: startOfToday }
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
