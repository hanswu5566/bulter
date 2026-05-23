import { db } from "../src/lib/db";

async function check() {
  console.log("Checking last parsed listing in database...");
  const lastListing = await db.listing.findFirst({
    orderBy: { createdAt: "desc" }
  });

  if (!lastListing) {
    console.log("No listings found in database!");
    return;
  }

  console.log("\n--- Listing Info ---");
  console.log("ID:", lastListing.id);
  console.log("Title:", lastListing.title);
  console.log("Address:", lastListing.address);
  console.log("Price:", lastListing.price);
  console.log("Coordinates:", lastListing.lat, lastListing.lng);
  
  console.log("\n--- Butler Insight ---");
  const insight = lastListing.butlerInsight as any;
  if (insight) {
    console.log("Verdict:", insight.verdict);
    console.log("Price Comparison:", insight.priceComparison);
    console.log("Maps Threats (Count):", insight.mapsThreats?.length || 0);
    console.log("Maps Conveniences (Count):", insight.mapsConveniences?.length || 0);
    if (insight.mapsConveniences && insight.mapsConveniences.length > 0) {
      console.log("Sample Conveniences:", insight.mapsConveniences);
    }
  } else {
    console.log("No butlerInsight found!");
  }
}

check().catch(console.error);
