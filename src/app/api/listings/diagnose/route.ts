import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { diagnoseMatchWithAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    const userId = session.user.id;

    const { listingData } = await req.json();
    if (!listingData) {
      return errorResponse("Missing listing data", 400);
    }

    // 1. 檢查次數限制 (Rate Limit)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.rateLimit.count({
      where: {
        identifier: userId,
        action: "AI_DIAGNOSE",
        timestamp: {
          gte: today
        }
      }
    });

    const LIMIT = 5; // 每天限制 5 次
    if (count >= LIMIT) {
      return errorResponse(`今日 AI 診斷次數已達上限 (${LIMIT}次)，請明天再試。`, 429);
    }

    // 2. 讀取用戶偏好
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiTags: true }
    });

    let aiTags = user?.aiTags as any;
    if (!aiTags && userId === "test-user-id") {
      aiTags = {
        tags: ["安靜巷弄", "採光優越"],
        wishlist: "希望客廳採光好，有貓咪活動空間"
      };
    }
    let tagsToPass: string[] = [];

    if (aiTags) {
      if (Array.isArray(aiTags)) {
        tagsToPass = aiTags as string[];
      } else if (typeof aiTags === "object") {
        tagsToPass = aiTags.tags || [];
        if (aiTags.wishlist) {
          tagsToPass.push(`許願需求: ${aiTags.wishlist}`);
        }
      }
    }

    // 3. 執行 AI 診斷
    const matchResult = await diagnoseMatchWithAI(tagsToPass, listingData);

    // 4. 記錄此次調用
    await prisma.rateLimit.create({
      data: {
        identifier: userId,
        action: "AI_DIAGNOSE",
      }
    });

    return successResponse({
      ...matchResult,
      remainingCredits: LIMIT - count - 1
    });
  });
}
