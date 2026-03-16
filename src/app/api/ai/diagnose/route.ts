import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { diagnoseMatchWithAI, genAI, MODELS } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { listingId, locale = "zh-TW" } = await req.json();
    if (!listingId) return errorResponse("Missing listingId", 400);

    // 1. Get User Data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { aiTags: true }
    });
    
    const userTags = (user?.aiTags as string[]) || [];
    // 如果沒有標籤，也可以進行基礎診斷，不一定要擋死
    
    // 2. Get Listing Data
    const listing = await db.listing.findUnique({
      where: { id: listingId }
    });
    
    if (!listing) return errorResponse("Listing not found", 404);

    // 3. 如果房源還沒有基礎 Butler Insight (點評)，順便生成並存入資料庫
    let butlerInsight = listing.butlerInsight;
    if (!butlerInsight) {
      const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });
      const prompt = `
        You are the "AI Rental Butler". Analyze this listing and generate a brief, professional insight report.
        Focus on highlights (what's great) and potential risks (what to check).

        Title: ${listing.title}
        Description: ${listing.description}
        Features: ${JSON.stringify(listing.features)}

        Return a JSON object:
        {
          "highlights": ["highlight 1", "highlight 2"],
          "risks": ["risk 1", "risk 2"],
          "summary": "one sentence summary"
        }
        Use the language associated with locale: ${locale}.
      `;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const insight = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (insight) {
          await db.listing.update({
            where: { id: listingId },
            data: { butlerInsight: insight }
          });
          butlerInsight = insight;
        }
      } catch (aiError) {
        console.error("AI Insight generation failed:", aiError);
      }
    }

    // 4. Run AI Diagnosis (Personalized Match)
    const result = await diagnoseMatchWithAI(userTags, listing, locale);

    // 將基礎點評也併入回傳，方便前端更新顯示
    return successResponse({
      ...result,
      butlerInsight
    });
  });
}
