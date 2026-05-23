import { db } from "../src/lib/db";
import { detectNearbyAccidents } from "../src/lib/maps";

async function run() {
  console.log("Searching for a listing with valid GPS coordinates in DB...");
  
  // Find first listing with valid lat/lng
  const listing = await db.listing.findFirst({
    where: {
      lat: { not: null },
      lng: { not: null }
    }
  });

  if (!listing) {
    console.log("No listing with valid coordinates found! Let's use a default coordinate in Taipei Center (e.g., 25.0421, 121.5069)...");
    const defaultCoords = { lat: 25.0143, lng: 121.4672 };
    console.log(`Location: Banqiao District (coords: ${defaultCoords.lat}, ${defaultCoords.lng})`);
    
    const report = await detectNearbyAccidents(defaultCoords);
    console.log("\n🚦 --- Aggregated Traffic Safety Report ---");
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\n--- Found Listing ---");
  console.log("Title:", listing.title);
  console.log("Address:", listing.address);
  console.log("GPS Coords:", listing.lat, listing.lng);

  const report = await detectNearbyAccidents({ lat: listing.lat!, lng: listing.lng! });
  
  console.log("\n🚦 --- Aggregated Traffic Safety Report ---");
  console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
