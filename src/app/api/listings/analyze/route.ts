import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeListingForExtension, diagnoseMatchWithAI, generateInspectionGuideWithAI, getFlatUserTags } from "@/lib/ai";
import { embedListing } from "@/lib/ai/embeddings";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse, withRateLimit } from "@/lib/api-utils";
import { scrape591 } from "@/lib/scrapers/taiwan-591";
import { uploadFromUrl } from "@/lib/storage";
import { detectNearbyThreats, detectNearbyConveniences, getRealPriceComparison, detectNearbyAccidents, getNearbyGeoCache, geocodeAddress, getCityFallbackCoords } from "@/lib/maps";
import { checkQuotaOnly, consumeTokens } from "@/lib/quota";

export async function POST(req: Request) {
  const session = await auth();

  // Mandatory authentication to prevent anonymous abuse
  if (!session?.user?.id) {
    return errorResponse("Unauthorized. Please login first.", 401);
  }

  const limit = 5;
  const windowSeconds = 86400; // 5 requests per 24 hours

  return withRateLimit(req, "ANALYZE_LISTING", limit, windowSeconds, async (session) => {
    return withErrorHandler(async () => {
    const { url } = await req.json();

    if (session?.user?.id) {
      // Dynamic Unified SaaS Token Quota check!
      const quota = await checkQuotaOnly(session.user.id, "LISTING_ANALYZE");
      if (!quota.allowed) {
        return errorResponse(`您的每日代幣點數不足！一鍵避雷解析需要 ${quota.cost} 點，您今日已使用 ${quota.used} / ${quota.max} 點。`, 403);
      }


    }

    if (!url) {
      return errorResponse("Missing URL in request", 400);
    }

    const regex = /^(https?:\/\/)?(rent|m)\.591\.com\.tw\/(rent-detail-)?([0-9]+)/i;
    if (!regex.test(url.trim())) {
      return errorResponse("⚠️ 格式不正確！只允許貼上正確的台灣 591 房源網址（例如：https://rent.591.com.tw/21210742）", 400);
    }

    // 1. 優先檢查資料庫是否已經有這個網址的解析紀錄 (Cache) - 暫時註解以強制重新分析
    const existing = await db.listing.findUnique({
      where: { sourceUrl: url }
    });


    if (existing && (existing.features as any)?.size) {
      console.log("Serving from cache for URL:", url);
      
      let matchResult = null;
      if (session?.user?.id) {
        // Check if this specific user has already parsed or saved this listing before
        const alreadyHasStatus = await db.userListingStatus.findUnique({
          where: {
            userId_listingId: {
              userId: session.user.id,
              listingId: existing.id
            }
          }
        });

        if (!alreadyHasStatus) {
          // Consumes listing analysis tokens since it is a brand new analysis action for THIS user!
          await consumeTokens(session.user.id, "LISTING_ANALYZE");
          console.log(`[Quota Deducted - First Time Cache Hit] Consumed tokens for user: ${session.user.id}`);
        } else {
          console.log(`[Quota Free - Repeated Analysis] 0 tokens consumed for user: ${session.user.id}`);
        }

        // Add/restore to user's active collection
        await db.userListingStatus.upsert({
          where: {
            userId_listingId: {
              userId: session.user.id,
              listingId: existing.id
            }
          },
          update: {
            isSaved: true,
            isRemoved: false
          },
          create: {
            userId: session.user.id,
            listingId: existing.id,
            isSaved: true,
            isRemoved: false
          }
        });

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

      // 2. 使用自訂 591 解析器抓取網頁並下載優化圖片到 GCS
      console.log("Scraping page via custom 591 scraper:", url);
      let scraped;
    try {
      scraped = await scrape591(url);
    } catch (e) {
      console.error("Scraper failed:", e);
      return errorResponse("Failed to scrape listing page via custom scraper", 500);
    }

      const cleanContent = scraped.rawContent;

      // 3. 同步將第一張照片 (封面照) 下載優化並上傳到 GCS
      console.log("Uploading listing cover image to GCS...");
      const imageUrlsToSave = scraped.images && scraped.images.length > 0
        ? await Promise.all(scraped.images.slice(0, 1).map(img => uploadFromUrl(img)))
        : [];

      // 4. 呼叫 Gemini AI 進行自適應分析
      console.log("Calling Gemini for URL analysis...");
      const structuredData = await analyzeListingForExtension(cleanContent);

      if (!structuredData) {
        return errorResponse("AI failed to parse content", 500);
      }

      console.log("Calling Google Maps API, Accident DB & Real Price DB...");
      let threatCoords = scraped.lat && scraped.lng
        ? { lat: scraped.lat, lng: scraped.lng }
        : null;

      // Tier 2 Dynamic Fail-Safe: Call Google Geocoding API on the AI-extracted full address
      if (!threatCoords && structuredData.address) {
        console.log(`[Geocoding Fallback] Scraped GPS is null. Geocoding full address: "${structuredData.address}"...`);
        threatCoords = await geocodeAddress(structuredData.address);
        if (threatCoords) {
          console.log(`[Geocoding Success] Geocoding resolved exact GPS coordinates: ${threatCoords.lat}, ${threatCoords.lng}`);
        }
    }

      if (!threatCoords) {
        const targetAddress = structuredData.address || "";
        const districtCoords: Record<string, { lat: number; lng: number }> = {
          "板橋區": { lat: 25.0143, lng: 121.4672 },
          "中山區": { lat: 25.0685, lng: 121.5333 },
          "大安區": { lat: 25.0263, lng: 121.5430 },
          "信義區": { lat: 25.0273, lng: 121.5671 },
          "三重區": { lat: 25.0726, lng: 121.4894 },
          "新莊區": { lat: 25.0359, lng: 121.4456 },
          "中和區": { lat: 24.9985, lng: 121.4989 },
          "永和區": { lat: 25.0078, lng: 121.5151 },
          "文山區": { lat: 24.9898, lng: 121.5585 },
          "士林區": { lat: 25.0922, lng: 121.5245 },
          "北投區": { lat: 25.1321, lng: 121.4987 },
          "內湖區": { lat: 25.0689, lng: 121.5909 },
          "南港區": { lat: 25.0558, lng: 121.6072 },
          "松山區": { lat: 25.0598, lng: 121.5572 },
          "萬華區": { lat: 25.0354, lng: 121.4997 },
          "汐止區": { lat: 25.0646, lng: 121.6513 },
          "淡水區": { lat: 25.1693, lng: 121.4446 },
          "蘆洲區": { lat: 25.0828, lng: 121.4753 },
          "土城區": { lat: 24.9732, lng: 121.4489 },
          "新店區": { lat: 24.9781, lng: 121.5405 },
          "林口區": { lat: 25.0775, lng: 121.3914 },
          "鶯歌區": { lat: 24.9558, lng: 121.3472 },
          "八里區": { lat: 25.1461, lng: 121.3959 },
          "瑞芳區": { lat: 25.1075, lng: 121.8233 },
          "三峽區": { lat: 24.9249, lng: 121.3675 },
          "五股區": { lat: 25.0673, lng: 121.4341 },
          "泰山區": { lat: 25.0624, lng: 121.4335 },
          "深坑區": { lat: 25.0027, lng: 121.6263 },
          "石門區": { lat: 25.2914, lng: 121.5657 },
          "金山區": { lat: 25.2218, lng: 121.6395 },
          "萬里區": { lat: 25.1776, lng: 121.6894 },
          "三芝區": { lat: 25.2585, lng: 121.5011 }
        };

        for (const [dist, coord] of Object.entries(districtCoords)) {
          if (targetAddress.includes(dist)) {
            console.log(`[Fail-Safe Route] GPS coordinates missing, fallback to AI district center for: ${dist}`);
            threatCoords = coord;
            break;
        }
        }
      }

      // Tier 4 City-level Backup Fallback: cover Taichung, Tainan, Hualien etc. perfectly!
      if (!threatCoords && structuredData.address) {
        const cityCoord = getCityFallbackCoords(structuredData.address);
        if (cityCoord) {
          console.log(`[City Fallback Route] GPS coordinates missing, fallback to City center for address: "${structuredData.address}"`);
          threatCoords = cityCoord;
        }
    }

      if (!threatCoords) {
        threatCoords = { lat: 25.0421, lng: 121.5069 };
      }

      // O(1) Geospatial Sharing Cache: Share cached Google Places results if a neighbor listing (within 150m) exists
      const geoCache = await getNearbyGeoCache(threatCoords);
      let mapsThreats = null;
      let mapsConveniences = null;

      if (geoCache) {
        mapsThreats = geoCache.mapsThreats;
        mapsConveniences = geoCache.mapsConveniences;
      } else {
        mapsThreats = await detectNearbyThreats(threatCoords);
        mapsConveniences = await detectNearbyConveniences(threatCoords);
    }

      const trafficAccidents = await detectNearbyAccidents(threatCoords);
    const priceComp = await getRealPriceComparison(structuredData.address || "峨眉街", structuredData.features?.type || "整層住家", structuredData.features?.size, structuredData.features?.elevator);

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
          mapsThreats: mapsThreats,
          mapsConveniences: mapsConveniences,
          trafficAccidents: trafficAccidents
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
      structuredData.butlerInsight.mapsConveniences = mapsConveniences;
      structuredData.butlerInsight.trafficAccidents = trafficAccidents;
      structuredData.butlerInsight.priceComparison = priceComp;
      structuredData.butlerInsight.inspectionGuide = inspectionGuide;
    }

      // 5. 存入資料庫作為快取 (Cache) 並儲存真實照片與經緯度
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
          images: imageUrlsToSave,
          lat: threatCoords.lat,
          lng: threatCoords.lng,
          butlerInsight: {
            verdict: structuredData.verdict,
            risks: structuredData.risks,
            estimatedTotalCost: structuredData.estimatedTotalCost,
            highlightLines: structuredData.highlightLines,
            tagEvaluation: structuredData.tagEvaluation,
            mapsThreats: mapsThreats,
            mapsConveniences: mapsConveniences,
            trafficAccidents: trafficAccidents,
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
          images: imageUrlsToSave,
          lat: threatCoords.lat,
          lng: threatCoords.lng,
          butlerInsight: {
            verdict: structuredData.verdict,
            risks: structuredData.risks,
            estimatedTotalCost: structuredData.estimatedTotalCost,
            highlightLines: structuredData.highlightLines,
            tagEvaluation: structuredData.tagEvaluation,
            mapsThreats: mapsThreats,
            mapsConveniences: mapsConveniences,
            trafficAccidents: trafficAccidents,
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

      if (newListing) {
        // Log token consumption for listing analysis!
        await consumeTokens(session.user.id, "LISTING_ANALYZE");
        console.log(`[Quota Deducted] Consumed tokens for user: ${session.user.id}`);
      }
    } catch (dbError) {
      console.error("Failed to save or update DB:", dbError);
    }

    // 6. 生成 Vector Embedding 並存入資料庫
    if (newListing) {
      console.log("Generating Vector Embedding...");
      try {
        const embedded = await embedListing(newListing.id, {
          title: structuredData.title,
          address: structuredData.address,
          description: structuredData.description,
          price: structuredData.price,
          features: structuredData.features,
          butlerInsight: newListing.butlerInsight,
        });
        console.log(
          embedded
            ? "Successfully saved vector embedding."
            : "Skipped embedding: listing carries no indexable text."
        );
      } catch (embedError) {
        console.error("Failed to generate or save embedding:", embedError);
      }
    }

    let aiMatchResult = null;
    if (session?.user?.id && newListing) {
      // Ensure the User record exists in the database (Robust fail-safe for db resets!)
      const userExists = await db.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!userExists) {
        console.log(`[User Restored] User record missing from DB. Re-creating User: ${session.user.id}`);
        await db.user.create({
          data: {
            id: session.user.id,
            name: session.user.name || "匿名用戶",
            email: session.user.email || `user-${session.user.id}@butler.io`,
            role: "TENANT"
          }
        });
      }

      // Add to user's active collection
      await db.userListingStatus.upsert({
        where: {
          userId_listingId: {
            userId: session.user.id,
            listingId: newListing.id
          }
        },
        update: {
          isSaved: true,
          isRemoved: false
        },
        create: {
          userId: session.user.id,
          listingId: newListing.id,
          isSaved: true,
          isRemoved: false
        }
      });

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
