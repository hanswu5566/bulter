import { withErrorHandler, successResponse, errorResponse, withRateLimit } from "@/lib/api-utils";
import { ButlerService } from "@/lib/services/butler.service";
import { checkQuotaOnly, consumeTokens } from "@/lib/quota";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    // 1. Rate Limiting via Redis (15 requests per minute)
    return withRateLimit(req, "AI_INTERVIEW", 15, 60, async (session) => {
      // 2. Auth Check (Butler is for members only)
      if (!session?.user?.id) {
        return errorResponse("Please login to use Butler.", 401);
      }

      const body = await req.json();
      const userId = session.user.id;
      const userEmail = session.user.email;

      // 3. Dynamic Unified SaaS Token Quota check!
      const UNLIMITED_EMAILS = ["hanswu@google.com", "shankesleroux8988@gmail.com"];
      const isUnlimited = userEmail && UNLIMITED_EMAILS.includes(userEmail);

      const quota = await checkQuotaOnly(userId, "AI_INTERVIEW");

      if (!isUnlimited && !quota.allowed) {
        return errorResponse(`您的每日代幣點數不足！發送對話需要 ${quota.cost} 點，您今日已使用 ${quota.used} / ${quota.max} 點。`, 403);
      }

      // 4. Execute Chat
      const data = await ButlerService.chat({
        sessionId: body.sessionId,
        message: body.message,
        role: body.role || "TENANT",
        locale: body.locale || "zh-TW",
        userId: userId,
      });

      // 5. Success with quota info
      await consumeTokens(userId, "AI_INTERVIEW");
      return successResponse({
        ...data,
        quota: { used: quota.used + quota.cost, limit: quota.max }
      });
    });
  });
}

import { NextResponse } from "next/server";
