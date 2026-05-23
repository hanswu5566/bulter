import { db } from "../src/lib/db";
import { scrape591 } from "../src/lib/scrapers/taiwan-591";
import { analyzeListingForExtension, genAI } from "../src/lib/ai";
import { geocodeAddress, getCityFallbackCoords, getRealPriceComparison } from "../src/lib/maps";
import { uploadFromUrl } from "../src/lib/storage";

const TEST_URLS = [
  "https://rent.591.com.tw/21238918",
  "https://rent.591.com.tw/21253154",
  "https://rent.591.com.tw/18722255",
  "https://rent.591.com.tw/21155940",
  "https://rent.591.com.tw/21183609"
];

async function main() {
  console.log("[Batch Parser] Initializing batch listing importer & verifier...");
  
  // 1. Find the active test user in the database
  const user = await db.user.findFirst();
  if (!user) {
    console.error("No active user found in the database!");
    return;
  }
  console.log(`[Batch Parser] Target User Collection Owner: ${user.name} (${user.id})`);

  for (const url of TEST_URLS) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🚀 Processing URL: ${url}...`);
    
    // A. Scrape raw content
    let scraped;
    try {
      scraped = await scrape591(url);
      console.log(`[Scraper] Successfully scraped title: "${scraped.title}"`);
    } catch (err) {
      console.error(`[Scraper Error] Failed to scrape ${url}:`, err);
      continue;
    }

    // B. AI structured parsing
    let structuredData;
    try {
      structuredData = await analyzeListingForExtension(scraped.rawContent);
      console.log(`[Gemini] Extracted specs: Size = ${structuredData.features?.size}坪, Type = ${structuredData.features?.type}, Elevator = ${structuredData.features?.elevator}`);
    } catch (err) {
      console.error(`[Gemini Error] Failed to parse content:`, err);
      continue;
    }

    // C. GCS Cover Upload
    const imageUrlsToSave = scraped.images && scraped.images.length > 0
      ? await Promise.all(scraped.images.slice(0, 1).map(img => uploadFromUrl(img).catch(() => img)))
      : [];

    // D. Geocode coords fallback
    let coords = scraped.lat && scraped.lng ? { lat: scraped.lat, lng: scraped.lng } : null;
    if (!coords && structuredData.address) {
      coords = await geocodeAddress(structuredData.address);
    }
    if (!coords) {
      coords = { lat: 25.0421, lng: 121.5069 }; // Default Ximending
    }

    // E. Upgraded price comparison with elevator + size adaptations!
    const priceComp = await getRealPriceComparison(
      structuredData.address || scraped.title,
      structuredData.features?.type || "整層住家",
      structuredData.features?.size,
      structuredData.features?.elevator
    );

    console.log(`[Valuation Model] Price Comparison Computed:`);
    console.log(`  Listing Rent: NT$ ${structuredData.price}`);
    console.log(`  Size-Adjusted P50 Median: NT$ ${priceComp.averagePrice}`);
    console.log(`  Price Gap: ${priceComp.sizeAdjustment ? Math.round(((structuredData.price - priceComp.averagePrice) / priceComp.averagePrice) * 100) : 0}%`);
    console.log(`  District: ${priceComp.city} ${priceComp.district}`);
    console.log(`  Pricing Level: ${structuredData.price > priceComp.p75 ? "高度溢價 🔴" : structuredData.price < priceComp.p25 ? "超值低於行情 🟢" : "價格合理 🟡"}`);

    // F. Save to database cache
    const upserted = await db.listing.upsert({
      where: { sourceUrl: url },
      update: {
        title: structuredData.title || scraped.title,
        price: structuredData.price || scraped.price,
        address: structuredData.address || "未知地址",
        description: structuredData.description || "",
        features: structuredData.features,
        images: imageUrlsToSave,
        lat: coords.lat,
        lng: coords.lng,
        butlerInsight: {
          verdict: structuredData.verdict,
          risks: structuredData.risks,
          estimatedTotalCost: structuredData.estimatedTotalCost,
          highlightLines: structuredData.highlightLines,
          priceComparison: priceComp
        }
      },
      create: {
        title: structuredData.title || scraped.title,
        price: structuredData.price || scraped.price,
        address: structuredData.address || "未知地址",
        description: structuredData.description || "",
        sourceUrl: url,
        features: structuredData.features,
        images: imageUrlsToSave,
        lat: coords.lat,
        lng: coords.lng,
        butlerInsight: {
          verdict: structuredData.verdict,
          risks: structuredData.risks,
          estimatedTotalCost: structuredData.estimatedTotalCost,
          highlightLines: structuredData.highlightLines,
          priceComparison: priceComp
        },
        landlord: {
          connectOrCreate: {
            where: { id: "system-landlord" },
            create: { id: "system-landlord", name: "系統管理員", email: "system@butler.rent" }
          }
        }
      }
    });

    // G. Add listing to user's active collection comparison library
    await db.userListingStatus.upsert({
      where: {
        userId_listingId: {
          userId: user.id,
          listingId: upserted.id
        }
      },
      update: { isSaved: true, isRemoved: false },
      create: {
        userId: user.id,
        listingId: upserted.id,
        isSaved: true,
        isRemoved: false
      }
    });

    console.log(`[Database] Successfully registered & bound Listing ID: ${upserted.id} to user ${user.name}'s Collections!`);
  }

  console.log("\n[Batch Parser] Batch import completed successfully! All listings are now live inside your Comparison Library!");
}

main().catch(err => console.error(err));
