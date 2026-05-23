import { db } from "../src/lib/db";

async function listAll() {
  const listings = await db.listing.findMany();
  console.log(`\n--- Total Listings in DB: ${listings.length} ---`);
  listings.forEach((l, idx) => {
    console.log(`\n[${idx + 1}] ID: ${l.id}`);
    console.log("Title:", l.title);
    console.log("Address:", l.address);
    console.log("Coordinates:", l.lat, l.lng);
    console.log("Source URL:", l.sourceUrl);
    const insight = l.butlerInsight as any;
    if (insight && insight.trafficAccidents) {
      console.log("Accidents Street Sample:", insight.trafficAccidents.streets);
      console.log("Accidents Count A2:", insight.trafficAccidents.a2Count);
    } else {
      console.log("Accidents Stats: NULL");
    }
  });
}

listAll().catch(console.error);
