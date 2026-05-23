import { db } from "../src/lib/db";

async function run() {
  const listing = await db.listing.findFirst({
    orderBy: { createdAt: "desc" }
  });

  if (!listing) {
    console.log("No listings found.");
    return;
  }

  console.log("\n==========================================");
  console.log("Title:", listing.title);
  console.log("Address:", listing.address);
  console.log("AI Estimated Total Cost JSON:");
  console.log(JSON.stringify((listing.butlerInsight as any)?.estimatedTotalCost, null, 2));
  console.log("==========================================\n");
}

run();
