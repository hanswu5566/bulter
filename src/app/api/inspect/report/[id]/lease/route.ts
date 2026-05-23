import { db } from "@/lib/db";
import { auth } from "@/auth";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { genAI, MODELS, generateWithRetry } from "@/lib/ai";
import { checkQuotaOnly, consumeTokens } from "@/lib/quota";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    // Query report and listing details
    const report = await db.inspectionReport.findUnique({
      where: { id },
      include: {
        listing: { select: { title: true, address: true, price: true, butlerInsight: true, features: true } },
        tenant: { select: { name: true } }
      }
    });

    if (!report) {
      return errorResponse("Inspection report not found", 404);
    }

    // BOLA / IDOR check: ensure user owns this report
    if (report.tenantId !== session.user.id) {
      return errorResponse("Forbidden. You do not own this report.", 403);
    }

    // 3. Dynamic Unified SaaS Token Quota check!
    const quota = await checkQuotaOnly(session.user.id, "AI_LEASE");
    if (!quota.allowed) {
      return errorResponse(`您的每日代幣點數不足！生成租約需要 ${quota.cost} 點，您今日已使用 ${quota.used} / ${quota.max} 點。`, 403);
    }

    try {
      const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });
      
      const listing = (report.listing as any) || {};
      const butlerInsight = listing.butlerInsight || {};
      const features = listing.features || {};
      
      // Parse checklist details into permanent legal defects
      const checklistMap = (report.checklistData as Record<string, { checked: boolean; isPermanent: boolean }>) || {};
      const defectList: string[] = [];
      Object.entries(checklistMap).forEach(([key, val]) => {
        if (val.checked && val.isPermanent) {
          defectList.push(key);
        }
      });

      const prompt = `
        You are an elite real estate lawyer in Taiwan.
        Generate an official, 100% legally compliant "中華民國住宅租賃契約書" in Traditional Chinese (zh-TW) that strictly conforms to the 22 articles of the Executive Yuan Residential Lease Agreement Template (中華民國行政院定型化契約範本).
        
        🏆 IMPORTANT LEGAL RULE (CRITICAL):
        - You MUST NOT pre-fill the names, ID numbers, birthdates, or addresses of the landlord (出租人) and tenant (承租人). Leave them completely blank using standard professional underlines: _________________________
        - You MUST NOT pre-fill any exact years, months, or days for the Lease Term (租賃期限) or the Signing Date (立約日期). Leave them completely blank as: 民國 ______ 年 ______ 月 ______ 日
        - ONLY compile the objective listing details (address, monthly rent, and utilities/furniture list) into the contract!

        INPUT DATA:
        - Listing Title: ${listing.title}
        - Listing Address: ${listing.address}
        - Monthly Rent: NT$ ${Number(listing.price).toLocaleString()} TWD
        - Pre-Existing Defects Found On-Site: ${defectList.length > 0 ? defectList.join("; ") : "無明顯現況瑕疵"}
        - Utility Billing Type: ${butlerInsight?.estimatedTotalCost?.utilityBillingType || "UNKNOWN"}
        - Utility Estimate Details: ${butlerInsight?.estimatedTotalCost?.utilityEstimateDesc || "依帳單計費"}
        - Elevator: ${features?.elevator ? "有" : "無"}
        - Pets Allowed: ${features?.pets === "allow" ? "是" : "否"}
        - Cooking Allowed: ${features?.cooking === "allow" ? "是" : "否"}

        RULES:
        1. Write in clean, highly professional Traditional Chinese conforming to standard legal contract terminology.
        2. Fill out and render ALL the standard official contract clauses to make it as complete and professional as a physical paper lease:
           - 第一條：租賃標的及範圍
           - 第二條：租賃期限 (Leave year, month, and day completely blank: 自民國 ______ 年 ______ 月 ______ 日起至民國 ______ 年 ______ 月 ______ 日止)
           - 第三條：租金約定及支付 (TWD ${Number(listing.price).toLocaleString()} /月，每月 ______ 日前支付)
           - 第四條：擔保金（押金）約定及返還 (2個月押金: NT$ ${(Number(listing.price) * 2).toLocaleString()}，於交屋時以 _________________ 交付)
           - 第五條：租賃期間相關費用之支付 (According to Taipower invoice billing vs flat rate. If flat rate, limit to Taipower max caps!)
           - 第六條：使用租賃住宅之限制 (Pets: ${features?.pets === "allow" ? "允許養寵物" : "禁止養寵物"}, Cooking: ${features?.cooking === "allow" ? "可開伙" : "不可開伙"})
           - 第七條：修繕 (Landlord responsible for standard repair of all main systems)
           - 第八條：承租人之義務及賠償責任
           - 第九條：房屋裝修及改裝
           - 第十條：任意終止租約之約定
           - 第十一條：出租人終止租約
           - 第十二條：承租人終止租約
           - 第十三條：特約條款及房屋現況瑕疵聲明 (🏆 DISPUTE PREVENTER: You MUST explicitly list all pre-existing defects here: ${defectList.length > 0 ? defectList.join("; ") : "無明示瑕疵"}. Declare: 「經承租人會同智慧管家實地檢檢，確認本房屋在交屋前已存在以下瑕疵：[上述瑕疵]。雙方約定出租人應於交屋前負責修繕/排除完畢，且承租人對此等既有瑕疵免除任何損害賠償或扣押金責任，特此約定。」)
           - 第十四條：租賃住宅之返還
           - 第十五條：送達地址與爭議處理
           - 雙方立約人簽名欄位 (Leave names, ID numbers, phone numbers, and addresses completely blank as _________________________)
           - 立約日期 (Leave completely blank as: 中華民國 ______ 年 ______ 月 ______ 日)
           - 附表一：附屬設備確認清單 (Build a beautifully formatted HTML table listing Air Conditioner, Washing Machine, Sofa, Bed, natural gas, etc., showing whether they are checked or unmentioned!)
        3. Format the output as a SINGLE high-end, beautifully typeset HTML document.
        4. Embed inline CSS in the <style> tag for elegant, high-end rendering and printing:
           - Use Google Fonts Outfit or Inter, carbon-gray text (#333333), clay-orange highlights (#D2691E).
           - Elegant double-border tables, neat blanks with underlines.
           - Include "@media print { .page-break { page-break-before: always; } body { padding: 0; margin: 0; font-size: 12pt; } }" for clean A4 page printing.
           - You MUST explicitly insert a <div class="page-break"></div> container in the HTML content immediately before: (A) 「第十三條：特約條款及房屋現況瑕疵聲明」, (B) 「雙方立約人簽名欄位」, and (C) 「附表一：附屬設備確認清單」 to ensure clean document page layout!
        5. Return ONLY the raw HTML string starting with "<!DOCTYPE html>" and ending with "</html>". Do NOT enclose in markdown code blocks.
      `;

      const result = await generateWithRetry(model, prompt);
      let htmlContent = result?.response.text() || "";
      
      // Clean up any accidentally output markdown wraps
      htmlContent = htmlContent.replace(/^```html\s*/i, "").replace(/```$/, "").trim();
      
      // 6. Consumes lease generation tokens on success!
      await consumeTokens(session.user.id, "AI_LEASE");

      return successResponse({ html: htmlContent });
    } catch (err: any) {
      console.error("Failed to generate lease with AI:", err);
      return errorResponse("AI Lease Generation Failed", 500);
    }
  });
}
