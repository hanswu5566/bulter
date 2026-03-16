import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { calculateMatchScore } from "@/lib/matching";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "LANDLORD") {
      return errorResponse("Unauthorized", 401);
    }

    // 1. 找出房東的所有房源
    const listings = await db.listing.findMany({
      where: { landlordId: session.user.id },
      include: {
        reports: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // 1.1 幫所有圖片生成 Signed URLs
    const listingsWithSignedUrls = await Promise.all(listings.map(async (l) => {
      const signedImages = l.images ? await Promise.all(l.images.map(img => getSignedDownloadUrl(img))) : [];
      return { ...l, images: signedImages };
    }));

    // 2. 模擬尋找合適房客 (在真實場景中會比對 User 表中的 aiTags)
    // 這裡我們抓取最近有活躍標籤的房客作為展示
    const potentialTenants = await db.user.findMany({
      where: { 
        role: "TENANT",
        aiTags: { not: null }
      },
      take: 5
    });

    // 3. 加上 AI 匹配邏輯 (這部分可以非同步處理，現在先包裝好回傳)
    const listingsWithMatches = await Promise.all(listingsWithSignedUrls.map(async (l) => {
      const matches = potentialTenants.map(t => ({
        id: t.id,
        name: t.name?.charAt(0) + "同學/先生/小姐", // 匿名化
        image: t.image,
        tags: t.aiTags,
        matchScore: Math.floor(Math.random() * 20) + 80, // 模擬匹配分
        reason: "管家評估：該房客的預算與生活靜謐需求與此房源高度契合。"
      })).sort((a, b) => b.matchScore - a.matchScore);

      return { ...l, matches };
    }));

    return successResponse(listingsWithMatches);
  });
}
