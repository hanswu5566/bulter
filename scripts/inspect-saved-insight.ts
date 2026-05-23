import { db } from "../src/lib/db";

async function run() {
  const listing = await db.listing.findFirst({
    orderBy: { createdAt: "desc" }
  });

  if (!listing) {
    console.log("No listings found.");
    return;
  }

  console.log(`\n--- Listing: "${listing.title}" ---`);
  console.log("Address:", listing.address);
  console.log("Coordinates:", listing.lat, listing.lng);

  const insight = listing.butlerInsight as any;
  if (insight) {
    console.log("\n--- Maps Threats (Count: " + (insight.mapsThreats?.length || 0) + ") ---");
    console.log(JSON.stringify(insight.mapsThreats, null, 2));

    console.log("\n--- Maps Conveniences (Count: " + (insight.mapsConveniences?.length || 0) + ") ---");
    console.log(JSON.stringify(insight.mapsConveniences, null, 2));
    
    console.log("\n--- Traffic Accidents ---");
    console.log(JSON.stringify(insight.trafficAccidents, null, 2));
  } else {
    console.log("No insight found.");
  }
}

run().catch(console.error);
