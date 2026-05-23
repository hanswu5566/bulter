import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { auth } from "@/auth";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { detectNearbyAccidents, detectNearbyThreats, detectNearbyConveniences, geocodeAddress, getRealPriceComparison } from "@/lib/maps";
import { generateInspectionGuideWithAI, analyzeListingForExtension } from "@/lib/ai";
import { scrape591 } from "@/lib/scrapers/taiwan-591";
import { calculateMatchScore } from "@/lib/matching";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return errorResponse("Unauthorized. Please login first.", 401);
    }

    const userId = session.user.id;

    // 1. Calculate current day's quota usage (today's midnight to now)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const usedQuota = await db.rateLimit.count({
      where: {
        identifier: userId,
        action: "LISTING_ANALYZE",
        timestamp: { gte: startOfToday }
      }
    });

    const maxQuota = 5;

    if (usedQuota >= maxQuota) {
      return errorResponse(`您的今日 AI 診斷額度已用罄（${usedQuota} / ${maxQuota} 次），將於明日零時自動重置。`, 403);
    }

    // 2. Fetch the target listing from database
    const listing = await db.listing.findUnique({
      where: { id }
    });

    if (!listing) {
      return errorResponse("Listing not found", 404);
    }

    // 3. Log a new RateLimit entry to consume 1 credit of the monthly quota
    await db.rateLimit.create({
      data: {
        identifier: userId,
        action: "LISTING_ANALYZE"
      }
    });

    // 4. Evict dynamic Redis caches for this listing's coordinate grid to force fresh Place queries
    if (listing.lat && listing.lng) {
      const gridLat = listing.lat.toFixed(3);
      const gridLng = listing.lng.toFixed(3);
      
      const cacheKeyThreats = `maps:threats:${gridLat}:${gridLng}`;
      const cacheKeyConveniences = `maps:conveniences:${gridLat}:${gridLng}`;
      
      await redis.del(cacheKeyThreats);
      await redis.del(cacheKeyConveniences);
      console.log(`[Recalc Cache Evict] Evicted Redis maps cache for grid: ${gridLat}, ${gridLng}`);
    }

    // 5. Resiliently resolve coordinates, with deep re-scraping fallback
    let lat = listing.lat;
    let lng = listing.lng;
    let freshInsight: any = listing.butlerInsight || {};
    let freshFeatures: any = listing.features || {};
    let freshTitle = listing.title;
    let freshPrice = listing.price;

    if (listing.sourceUrl) {
      console.log(`[Deep Recalc Scrape] Re-scraping original 591 source: ${listing.sourceUrl}`);
      try {
        const scraped = await scrape591(listing.sourceUrl);
        const parsed = await analyzeListingForExtension(scraped.rawContent, listing.address || "");
        if (parsed) {
          freshInsight = parsed;
          freshFeatures = parsed.features || listing.features;
          freshTitle = parsed.title || listing.title;
          freshPrice = parsed.price || listing.price;
          
          if (scraped.lat && scraped.lng) {
            lat = scraped.lat;
            lng = scraped.lng;
          }
        }
      } catch (err) {
        console.error("[Deep Recalc Scrape] Failed to re-scrape source URL:", err);
      }
    }

    if (!lat || !lng) {
      const geo = await geocodeAddress(listing.address || "");
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    const coords = { lat: lat || 25.0143, lng: lng || 121.4672 };

    // 6. Run fresh local traffic and conveniences lookups
    console.log(`[Recalculating API] Fresh recalculation for listing: ${freshTitle} at ${coords.lat}, ${coords.lng}`);
    const trafficAccidents = await detectNearbyAccidents(coords);
    const mapsConveniences = await detectNearbyConveniences(coords);
    const mapsThreats = await detectNearbyThreats(coords);

    // 7. Re-generate AI highlights & checklists on demand
    let inspectionGuide = null;
    let updatedButlerInsight = null;

    // Fetch user aiTags to calculate updated matching scores
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiTags: true }
    });

    if (freshInsight) {
      const oldInsight = freshInsight as any;
      
      try {
        const guideResult = await generateInspectionGuideWithAI({ ...listing, title: freshTitle, features: freshFeatures } as any, "zh-TW");
        inspectionGuide = guideResult;
      } catch (e) {
        console.error("Failed to regenerate inspection guide:", e);
        inspectionGuide = oldInsight.inspectionGuide;
      }

      const priceComp = await getRealPriceComparison(
        listing.address || "",
        (freshFeatures as any)?.type || "整層住家",
        (freshFeatures as any)?.size,
        (freshFeatures as any)?.elevator
      );

      // Compile refreshed butlerInsight object
      updatedButlerInsight = {
        ...oldInsight,
        mapsThreats,
        mapsConveniences,
        trafficAccidents,
        priceComparison: priceComp,
        inspectionGuide
      };
    }

    // 8. Overwrite and save the updated listing details to PostgreSQL
    const updatedListing = await db.listing.update({
      where: { id },
      data: {
        title: freshTitle,
        price: freshPrice,
        features: freshFeatures || undefined,
        lat: coords.lat,
        lng: coords.lng,
        butlerInsight: updatedButlerInsight || undefined
      },
      include: {
        landlord: { select: { id: true, name: true, image: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    // Calculate updated match score for frontend
    let matchResult = null;
    if (user?.aiTags) {
      matchResult = calculateMatchScore(user.aiTags, updatedListing);
    }

    return successResponse({
      listing: {
        ...updatedListing,
        matchResult
      },
      quota: {
        used: usedQuota + 1,
        max: maxQuota
      }
    });
  });
}
