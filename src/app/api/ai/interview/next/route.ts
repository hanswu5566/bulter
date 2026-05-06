import { withErrorHandler, successResponse, errorResponse, withRateLimit } from "@/lib/api-utils";
import { ButlerService } from "@/lib/services/butler.service";
import { getDailyUsage } from "@/lib/rate-limit";

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

      // 3. Daily Quota Check (Max 3 messages per day)
      // Special: Unlimited for specific emails
      const UNLIMITED_EMAILS = ["hanswu@google.com", "shankesleroux8988@gmail.com"];
      const isUnlimited = userEmail && UNLIMITED_EMAILS.includes(userEmail);

      const usedQuota = await getDailyUsage(userId);
      const QUOTA_LIMIT = 5;

      if (!isUnlimited && usedQuota >= QUOTA_LIMIT) {
        return NextResponse.json({
          success: false,
          error: "QUOTA_EXCEEDED",
          message: "You've used your daily 5 messages. Upgrade for more!",
          quota: { used: usedQuota, limit: QUOTA_LIMIT }
        }, { status: 403 });
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
      return successResponse({
        ...data,
        quota: { used: usedQuota + 1, limit: QUOTA_LIMIT }
      });
    });
  });
}

import { NextResponse } from "next/server";
