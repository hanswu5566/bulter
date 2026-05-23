import dotenv from "dotenv";
dotenv.config();

import { scrape591 } from "../src/lib/scrapers/taiwan-591";
import { analyzeListingForExtension } from "../src/lib/ai";
import { geocodeAddress, detectNearbyAccidents, detectNearbyConveniences, detectNearbyThreats, getCityFallbackCoords } from "../src/lib/maps";

async function inspectUrl(url: string) {
  console.log(`Starting inspection of URL: ${url}...`);
  try {
    // 1. Scrape listing page
    console.log("Scraping page via custom 591 scraper...");
    const scraped = await scrape591(url);
    console.log("Scrape finished successfully.");
    console.log("Scraped address (raw):", scraped.ruleData.address);
    console.log("Scraped GPS coords:", scraped.lat, scraped.lng);

    // 2. Run AI structured analyzer to extract full address
    console.log("Calling Gemini AI to structure listing address and content...");
    const cleanedContent = scraped.rawContent.substring(0, 12000);
    const structuredData = await analyzeListingForExtension(cleanedContent);
    
    if (!structuredData) {
      console.error("AI failed to structure content.");
      return;
    }
    console.log("AI Structured Address:", structuredData.address);

    // 3. Coordinate Resolution Flow (Defensive tiers)
    let lat = scraped.lat;
    let lng = scraped.lng;
    let resolutionMethod = "Scraped exact GPS";

    if (!lat || !lng) {
      if (structuredData.address) {
        console.log(`[Geocoding] Coordinates missing. Querying Google Geocoding for: "${structuredData.address}"...`);
        const geo = await geocodeAddress(structuredData.address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          resolutionMethod = "Google Geocoding (Precision house-level)";
        }
      }
    }

    if (!lat || !lng) {
      const cityFallback = getCityFallbackCoords(structuredData.address || "");
      if (cityFallback) {
        lat = cityFallback.lat;
        lng = cityFallback.lng;
        resolutionMethod = "City Fallback (Regional Center)";
      }
    }

    if (!lat || !lng) {
      lat = 25.0143;
      lng = 121.4672;
      resolutionMethod = "Neutral default center";
    }

    const coords = { lat, lng };
    console.log(`Resolved Location: ${coords.lat}, ${coords.lng} (via ${resolutionMethod})`);

    // 4. Pull safety and amenities details
    console.log("Querying Google Places (searchNearby) & 2025 Traffic Accidents DB...");
    const traffic = await detectNearbyAccidents(coords);
    const conveniences = await detectNearbyConveniences(coords);
    const threats = await detectNearbyThreats(coords);

    // 5. Print beautiful summary report!
    console.log("\n==================================================");
    console.log("📋 DYNAMIC INSIGHT SUMMARY REPORT");
    console.log("==================================================");
    console.log("Title:", structuredData.title || scraped.ruleData.title);
    console.log("Address:", structuredData.address);
    console.log("Price:", structuredData.price || scraped.ruleData.price);
    console.log(`GPS Coordinate: ${coords.lat}, ${coords.lng} (${resolutionMethod})`);
    
    console.log("\n🚦 --- 2025 交通狀況大數據 ---");
    console.log(`- 安全級別：${traffic.safetyRating} (${traffic.safetyLevel})`);
    console.log(`- 死亡車禍(A1)：${traffic.a1Count} 件 | 受傷車禍(A2)：${traffic.a2Count} 件`);
    console.log(`- 主要路段：`, traffic.streets);
    console.log(`- 主要肇因：`, traffic.causes);
    console.log(`- 涉及車種：`, traffic.types);
    console.log(`- 防禦指引：${traffic.description}`);

    console.log("\n👮🌳🛒 --- 環境機能生活圈 ---");
    console.log(`總共找到 ${conveniences?.length || 0} 個機能點：`);
    if (conveniences && conveniences.length > 0) {
      conveniences.forEach((c, idx) => {
        console.log(`  [${idx+1}] ${c.name} (${c.keyword}) - 距離：${c.distance}`);
      });
    } else {
      console.log("  無機能點。");
    }

    console.log("\n⚠️ --- 感官與安全地雷 ---");
    console.log(`總共找到 ${threats?.length || 0} 個地雷：`);
    if (threats && threats.length > 0) {
      threats.forEach((t, idx) => {
        console.log(`  [${idx+1}] ${t.name} (${t.keyword}) - 距離：${t.distance}`);
      });
    } else {
      console.log("  🎉 恭喜！周邊無明顯嫌惡或感官地雷！");
    }
    console.log("==================================================");

  } catch (error) {
    console.error("Inspection failed with error:", error);
  }
}

const targetUrl = "https://rent.591.com.tw/21228429";
inspectUrl(targetUrl);
