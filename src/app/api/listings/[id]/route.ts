import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { deleteFiles } from "@/lib/storage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, image: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        }
      }
    });

    if (!listing) {
      return errorResponse("Listing not found", 404);
    }

    // Generate Butler Insight if it doesn't exist
    if (!listing.butlerInsight) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        Use Traditional Chinese (zh-TW).
      `;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const insight = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (insight) {
          await db.listing.update({
            where: { id },
            data: { butlerInsight: insight }
          });
          listing.butlerInsight = insight;
        }
      } catch (aiError) {
        console.error("AI Insight generation failed:", aiError);
      }
    }

    return successResponse(listing);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const session = await auth();
    const { id } = await params;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);
    if (existing.landlordId !== session?.user?.id) return errorResponse("Unauthorized", 403);

    const data = await req.json();
    const updated = await db.listing.update({
      where: { id },
      data,
    });

    return successResponse(updated);
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const session = await auth();
    const { id } = await params;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);
    if (existing.landlordId !== session?.user?.id) return errorResponse("Unauthorized", 403);

    // 刪除資料庫紀錄前，先清理 GCS 中的圖片檔案
    if (existing.images && existing.images.length > 0) {
      await deleteFiles(existing.images);
    }

    await db.listing.delete({ where: { id } });
    return successResponse({ deleted: true });
  });
}
