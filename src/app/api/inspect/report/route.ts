import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { genAI, MODELS } from "@/lib/ai";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { listingId, checklistData, photos, aiSummary } = await req.json();

    // 1. Dynamic AI Summary Generator (Fusing the user's actual field notes!)
    let computedSummary = aiSummary || "使用者手動檢查紀錄";
    if (checklistData && Object.keys(checklistData).length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: MODELS.LITE });
        const prompt = `
          你是一個智慧租屋管家 Butler。房客剛剛完成了對房源的「實地看房檢驗（On-site Physical Inspection）」。
          以下是房客在現場實測核對出的事實數據與他們親手輸入的現場備註備忘錄：
          
          ${JSON.stringify(checklistData, null, 2)}
          
          請根據以上房客在現場「實際觀測到的事實與備註」，為房客撰寫一份溫暖、專業、且具備極致防坑與修繕洞察力的「實勘決策評估總結建議（AI Summary）」。
          
          【寫作指南】：
          1. 字數限制在 60 至 85 字之間，必須非常精煉、流暢且正中要害。
          2. 不要官腔或重複說大道理。直接針對房客標註出來的任何瑕疵或異常（例如：漏水、水壓小、隔音差等）進行直白評估。
          3. 如果有提到瑕疵，請在總結中給出具體的談判修繕建議（例如：要求房東承租前修好，或協議降租等）。
          4. 如果一切完美，請給予溫暖的肯定，讓房客放心承租。
          
          回傳格式：請直接回傳純文字的評估總結，不要包含任何 Markdown 標記或 JSON 格式。
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text()?.trim();
        if (text) {
          computedSummary = text;
        }
      } catch (err) {
        console.error("Failed to generate dynamic AI inspection summary via Gemini:", err);
      }
    }
    
    // Check if an inspection report already exists for this tenant & listing
    const existingReport = await db.inspectionReport.findFirst({
      where: {
        listingId,
        tenantId: session.user.id!
      }
    });

    let report;
    if (existingReport) {
      // Update the existing report cleanly in-place (Edit Mode!)
      report = await db.inspectionReport.update({
        where: { id: existingReport.id },
        data: {
          checklistData,
          photos,
          aiSummary: computedSummary,
          status: "COMPLETED",
        }
      });
      console.log(`[Inspection Edit Mode] Updated existing report ID: ${existingReport.id}`);
    } else {
      // Create a new report
      report = await db.inspectionReport.create({
        data: {
          listingId,
          tenantId: session.user.id!,
          checklistData,
          photos,
          aiSummary: computedSummary,
          status: "COMPLETED",
        }
      });
      console.log(`[Inspection Create Mode] Created brand new report ID: ${report.id}`);
    }

    // Update listing features with "Verified Facts" (Trust Loop)
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (listing) {
      const currentFeatures = (listing.features as any) || {};
      const updatedFeatures = {
        ...currentFeatures,
        verifiedFacts: {
          ...(currentFeatures.verifiedFacts || {}),
          ...checklistData,
        }
      };
      
      await db.listing.update({
        where: { id: listingId },
        data: { features: updatedFeatures },
      });
    }

    return successResponse(report, 201);
  });
}

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const reports = await db.inspectionReport.findMany({
      where: { tenantId: session.user.id },
      include: {
        listing: { select: { title: true, address: true, price: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(reports);
  });
}
