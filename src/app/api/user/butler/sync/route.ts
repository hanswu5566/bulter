import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { extractIntentFromChat } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { messages } = await req.json();
    
    // 1. 利用 Gemini 提取意圖與標籤
    const aiTags = await extractIntentFromChat(messages);
    
    // 2. 更新用戶資料
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { 
        aiTags: aiTags,
        // 如果是第一次同步，產生一個簡單的摘要
        trustSummary: aiTags.join(" | ") 
      },
    });

    return successResponse({ 
      tags: aiTags,
      user: updatedUser 
    });
  });
}
