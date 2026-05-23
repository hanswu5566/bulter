import { db } from "../src/lib/db";
import { getRealPriceComparison } from "../src/lib/maps";

async function main() {
  const id = "cmp8g25d30005atwr8kqk4ity";
  console.log(`[Fix Script] Fetching listing ${id}...`);
  
  const listing = await db.listing.findUnique({
    where: { id }
  });
  
  if (!listing) {
    console.error("Listing not found!");
    return;
  }
  
  console.log("Current features:", listing.features);
  console.log("Current priceComparison:", (listing.butlerInsight as any)?.priceComparison);
  
  const priceComp = await getRealPriceComparison(
    listing.address || "",
    (listing.features as any)?.type || "整層住家",
    (listing.features as any)?.size,
    (listing.features as any)?.elevator
  );
  
  console.log("Upgraded priceComparison calculated:", priceComp);
  
  const oldInsight = (listing.butlerInsight as any) || {};
  const updatedButlerInsight = {
    ...oldInsight,
    priceComparison: priceComp
  };
  
  await db.listing.update({
    where: { id },
    data: {
      butlerInsight: updatedButlerInsight
    }
  });
  
  console.log("Listing successfully fixed and updated in DB!");
}

main().catch(err => console.error(err));
