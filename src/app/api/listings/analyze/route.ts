import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeListingForExtension, diagnoseMatchWithAI, generateInspectionGuideWithAI, genAI } from "@/lib/ai";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse, withRateLimit } from "@/lib/api-utils";
import * as cheerio from "cheerio";
import { detectNearbyThreats, getRealPriceComparison } from "@/lib/maps";

function getFlatUserTags(aiTags: any): string[] {
  const rawPrefs = aiTags || {};
  const userTags: string[] = [];
  if (rawPrefs.budgetMax) userTags.push(`預算 ${rawPrefs.budgetMax} 元以下`);
  if (rawPrefs.budgetMin) userTags.push(`預算 ${rawPrefs.budgetMin} 元以上`);
  if (rawPrefs.regions && Array.isArray(rawPrefs.regions)) {
    rawPrefs.regions.forEach((r: string) => userTags.push(`希望在 ${r}`));
  }
  if (rawPrefs.lifestyleTags && Array.isArray(rawPrefs.lifestyleTags)) {
    rawPrefs.lifestyleTags.forEach((t: string) => userTags.push(t));
  }
  return userTags;
}

export async function POST(req: Request) {
  const session = await auth();
  const isAuth = !!session?.user?.id;
  const limit = isAuth ? 15 : 2;
  const windowSeconds = isAuth ? 86400 : 3600;

  return withRateLimit(req, "ANALYZE_LISTING", limit, windowSeconds, async () => {
    return withErrorHandler(async () => {
    const { url } = await req.json();

    if (!url) {
      return errorResponse("Missing URL in request", 400);
    }

    // 1. 優先檢查資料庫是否已經有這個網址的解析紀錄 (Cache) - 暫時註解以強制重新分析
    const existing = await db.listing.findUnique({
      where: { sourceUrl: url }
    });

    const session = await auth();

    if (existing && (existing.features as any)?.size) {
      console.log("Serving from cache for URL:", url);
      
      let matchResult = null;
      if (session?.user?.id) {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          select: { aiTags: true }
        });

        const aiTags = user?.aiTags;
        if (aiTags) {
          const flatTags = getFlatUserTags(aiTags);
          matchResult = await diagnoseMatchWithAI(flatTags, existing);
        }
      }

      return successResponse({
        listing: existing,
        matching: matchResult,
        isCached: true
      });
    }

    // 2. 伺服器端抓取網頁 (Server-side Scraping)
    console.log("Fetching page content for URL:", url);
    let htmlContent = "";
    try {
      const fetchRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!fetchRes.ok) {
        return errorResponse(`Failed to fetch listing page: ${fetchRes.status}`, 500);
      }

      htmlContent = await fetchRes.text();
    } catch (e) {
      console.error("Server fetch failed:", e);
      return errorResponse("Failed to fetch listing page via server", 500);
    }

    // 3. 清理 HTML 並提取核心數據
    let cleanContent = "";
    try {
      const $ = cheerio.load(htmlContent);
      // 移除無用標籤
      $('script').remove();
      $('style').remove();
      $('svg').remove();

      // 嘗試抓取 window.__NUXT__
      let nuxtData = "";
      $('script').each((_, el) => {
        const html = $(el).html();
        if (html && html.includes('window.__NUXT__')) {
          nuxtData = html.substring(0, 5000);
        }
      });

      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      cleanContent = `
        ${nuxtData ? `[核心數據]: ${nuxtData}` : ''}
        [網頁純文字]: ${bodyText.substring(0, 10000)}
      `;
    } catch (e) {
      console.error("Cheerio processing failed:", e);
      cleanContent = htmlContent.substring(0, 10000);
    }

    // 4. 呼叫 Gemini AI 進行自適應分析
    console.log("Calling Gemini for URL analysis...");
    const structuredData = await analyzeListingForExtension(cleanContent);

    if (!structuredData) {
      return errorResponse("AI failed to parse content", 500);
    }

    // 4.5 呼叫 Google Maps API 與實價登錄 (真實嫁接)
    console.log("Calling Google Maps API & Real Price DB...");
    // 這裡我們暫時寫死峨眉街的座標進行測試，真實環境應從 591 的 NuxtData 中用 Regex 提取 lat/lng
    const mapsThreats = await detectNearbyThreats({ lat: 25.0421, lng: 121.5069 });
    const priceComp = await getRealPriceComparison(structuredData.address || "峨眉街", structuredData.features?.type || "整層住家");

    // 4.7 Pre-generate the Double-Track AI Inspection Guide
    console.log("Pre-generating AI inspection guide...");
    let inspectionGuide = null;
    try {
      const tempListing = {
        title: structuredData.title || "未命名房源",
        features: structuredData.features,
        description: structuredData.description || "",
        butlerInsight: {
          risks: structuredData.risks,
          mapsThreats: mapsThreats
        }
      };
      const guideResult = await generateInspectionGuideWithAI(tempListing);
      if (guideResult && guideResult.points) {
        inspectionGuide = guideResult;
      }
    } catch (guideErr) {
      console.error("Failed to pre-generate inspection guide:", guideErr);
    }

    // 将真实数据合并入 butlerInsight
    if (structuredData.butlerInsight) {
      structuredData.butlerInsight.mapsThreats = mapsThreats;
      structuredData.butlerInsight.priceComparison = priceComp;
      structuredData.butlerInsight.inspectionGuide = inspectionGuide;
    }

    // 5. 存入資料庫作為快取 (Cache)
    console.log("Saving analyzed listing to DB...");
    let newListing = null;
    try {
      newListing = await db.listing.upsert({
        where: { sourceUrl: url },
        update: {
          title: structuredData.title || "未命名房源",
          price: structuredData.price || 0,
          address: structuredData.address || "未知地址",
          description: structuredData.description || "",
          features: structuredData.features,
          butlerInsight: {
            verdict: structuredData.verdict,
            risks: structuredData.risks,
            estimatedTotalCost: structuredData.estimatedTotalCost,
            highlightLines: structuredData.highlightLines,
            mapsThreats: mapsThreats,
            priceComparison: priceComp,
            inspectionGuide: inspectionGuide
          }
        },
        create: {
          title: structuredData.title || "未命名房源",
          price: structuredData.price || 0,
          address: structuredData.address || "未知地址",
          description: structuredData.description || "",
          sourceUrl: url,
          features: structuredData.features,
          butlerInsight: {
            verdict: structuredData.verdict,
            risks: structuredData.risks,
            estimatedTotalCost: structuredData.estimatedTotalCost,
            highlightLines: structuredData.highlightLines,
            mapsThreats: mapsThreats,
            priceComparison: priceComp,
            inspectionGuide: inspectionGuide
          },
          landlord: {
            connectOrCreate: {
              where: { id: "system-landlord" },
              create: { id: "system-landlord", name: "系統管理員", email: "system@butler.rent" }
            }
          }
        }
      });
    } catch (dbError) {
      console.error("Failed to save or update DB:", dbError);
    }

    // 6. 生成 Vector Embedding 並存入資料庫
    if (newListing && structuredData.address && structuredData.features?.size) {
      console.log("Generating Vector Embedding...");
      try {
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const specText = `地址: ${structuredData.address}。坪數: ${structuredData.features.size}。樓層: ${structuredData.features.floor || ''}`;
        
        const embedResult = await embedModel.embedContent({
          content: {
            parts: [{ text: specText }]
          },
          outputDimensionality: 768
        } as any);
        const vector = embedResult.embedding.values;
        
        const vectorStr = `[${vector.join(",")}]`;
        await db.$executeRaw`UPDATE "Listing" SET "embedding" = ${vectorStr}::vector WHERE "id" = ${newListing.id}`;
        console.log("Successfully saved vector embedding.");
      } catch (embedError) {
        console.error("Failed to generate or save embedding:", embedError);
      }
    }

    let aiMatchResult = null;
    if (session?.user?.id && newListing) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { aiTags: true }
      });

      const aiTags = user?.aiTags;
      if (aiTags) {
        const flatTags = getFlatUserTags(aiTags);
        aiMatchResult = await diagnoseMatchWithAI(flatTags, newListing);
      }
    }

    return successResponse({
      listing: newListing || structuredData,
      matching: aiMatchResult,
      isCached: false
    });
    });
  });
}
