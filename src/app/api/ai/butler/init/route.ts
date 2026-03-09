import { NextResponse } from "next/server";
import { genAI, MODELS } from "@/lib/ai";
import { withErrorHandler, successResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const { context, listingTitle, locale = "zh-TW" } = await req.json();
    
    const model = genAI.getGenerativeModel({ model: MODELS.LITE });

    const prompt = `
      You are Butler, a friendly AI rental assistant. 
      Generate a VERY short (under 20 words) greeting based on the user's current page context.
      CRITICAL: The greeting MUST be in the language associated with locale: ${locale}.
      
      Context: ${context}
      Listing Title: ${listingTitle || "N/A"}

      EXAMPLES (for zh-TW):
      - LISTING_DETAIL: "這間房源看起來很棒！想聽聽我的契合度分析嗎？"
      - LISTING_CREATE: "正在發布房源嗎？需要我幫您優化描述以吸引房客嗎？"
      - INSPECTION: "看房導引已開啟，讓我陪您一起檢查房屋細節吧。"
      - GENERAL: "您好！我是 Butler。有什麼我可以幫您的嗎？"
    `;

    const result = await model.generateContent(prompt);
    const greeting = result.response.text().trim();

    return successResponse({ greeting });
  });
}
