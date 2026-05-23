import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { SAAS_LIMITS, TOKEN_COSTS } from "@/lib/quota";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const entries = await db.rateLimit.findMany({
      where: {
        identifier: session.user.id,
        timestamp: { gte: startOfToday }
      },
      select: { action: true }
    });

    const used = entries.reduce((sum, e) => sum + (TOKEN_COSTS[e.action] || 0), 0);

    return successResponse({
      used,
      max: SAAS_LIMITS.DAILY_MAX_TOKENS
    });
  });
}
