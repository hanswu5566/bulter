import { db } from "../src/lib/db";

async function main() {
  console.log("🐘 Querying database listings...");
  const listings = await db.listing.findMany({
    select: { id: true, title: true, images: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  console.log(`📊 Total Listings in DB: ${listings.length}`);
  console.log("✨ Listings in DB:", JSON.stringify(listings, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
