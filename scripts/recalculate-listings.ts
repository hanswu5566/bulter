import { db } from "../src/lib/db";
import { detectNearbyAccidents, detectNearbyThreats, detectNearbyConveniences, geocodeAddress } from "../src/lib/maps";

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "板橋區": { lat: 25.0143, lng: 121.4672 },
  "中山區": { lat: 25.0685, lng: 121.5333 },
  "大安區": { lat: 25.0263, lng: 121.5430 },
  "信義區": { lat: 25.0273, lng: 121.5671 },
  "三重區": { lat: 25.0726, lng: 121.4894 },
  "新莊區": { lat: 25.0359, lng: 121.4456 },
  "中和區": { lat: 24.9985, lng: 121.4989 },
  "永和區": { lat: 25.0078, lng: 121.5151 },
  "文山區": { lat: 24.9898, lng: 121.5585 },
  "士林區": { lat: 25.0922, lng: 121.5245 },
  "北投區": { lat: 25.1321, lng: 121.4987 },
  "內湖區": { lat: 25.0689, lng: 121.5909 },
  "南港區": { lat: 25.0558, lng: 121.6072 },
  "松山區": { lat: 25.0598, lng: 121.5572 },
  "萬華區": { lat: 25.0354, lng: 121.4997 },
  "汐止區": { lat: 25.0646, lng: 121.6513 },
  "淡水區": { lat: 25.1693, lng: 121.4446 },
  "蘆洲區": { lat: 25.0828, lng: 121.4753 },
  "土城區": { lat: 24.9732, lng: 121.4489 },
  "新店區": { lat: 24.9781, lng: 121.5405 },
  "林口區": { lat: 25.0775, lng: 121.3914 },
  "鶯歌區": { lat: 24.9558, lng: 121.3472 },
  "八里區": { lat: 25.1461, lng: 121.3959 },
  "瑞芳區": { lat: 25.1075, lng: 121.8233 },
  "三峽區": { lat: 24.9249, lng: 121.3675 },
  "五股區": { lat: 25.0673, lng: 121.4341 },
  "泰山區": { lat: 25.0624, lng: 121.4335 },
  "深坑區": { lat: 25.0027, lng: 121.6263 },
  "石門區": { lat: 25.2914, lng: 121.5657 },
  "金山區": { lat: 25.2218, lng: 121.6395 },
  "萬里區": { lat: 25.1776, lng: 121.6894 },
  "三芝區": { lat: 25.2585, lng: 121.5011 }
};

async function main() {
  console.log("Starting database listing coordinates and traffic stats recalculation...");

  const listings = await db.listing.findMany();
  console.log(`Found ${listings.length} listings in database to verify.`);

  let updateCount = 0;

  for (const listing of listings) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing listing: "${listing.title}" (ID: ${listing.id})`);
    console.log(`Current coordinates in DB: ${listing.lat}, ${listing.lng}`);
    console.log(`Address in DB: ${listing.address}`);

    let lat = listing.lat;
    let lng = listing.lng;

    // Force upgrade if coordinates are null, Ximending, or static district center fallbacks
    const isXimending = lat === 25.0421 && lng === 121.5069;
    const isDistrictCenter = lat && lng && Object.values(DISTRICT_COORDS).some(c => c.lat === lat && c.lng === lng);

    if (!lat || !lng || isXimending || isDistrictCenter) {
      let matched = false;

      // High-Priority dynamic Google Geocoding fallback (accurate down to the house number!)
      if (listing.address) {
        console.log(`[Geocoding Recalc] Calling Google Geocoding for exact address: "${listing.address}"...`);
        const geo = await geocodeAddress(listing.address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          console.log(`[Geocoding Recalc Success] Upgraded to exact GPS coordinates: ${lat}, ${lng}`);
          matched = true;
        }
      }

      if (!matched) {
        const targetText = listing.address || listing.title || "";
        for (const [dist, coord] of Object.entries(DISTRICT_COORDS)) {
          if (targetText.includes(dist)) {
            lat = coord.lat;
            lng = coord.lng;
            console.log(`[Fallback Match] Recalculated coordinates to "${dist}": ${lat}, ${lng}`);
            matched = true;
            break;
          }
        }
      }

      if (!matched && isXimending) {
        // Keep Ximending only if no regional match found
        console.log(`[Default Match] Keeping default coordinate (Ximending) for non-matching district: ${lat}, ${lng}`);
      }
    }

    // Universal fallback if it still has no coords
    if (!lat || !lng) {
      lat = 25.0421;
      lng = 121.5069;
      console.log(`[Default Match] Fallback to Ximending: ${lat}, ${lng}`);
    }

    const coords = { lat, lng };

    console.log(`Recalculating Google Maps threats, conveniences & accident stats for coordinates: ${coords.lat}, ${coords.lng}...`);

    // Calculate new stats
    const mapsThreats = await detectNearbyThreats(coords);
    const mapsConveniences = await detectNearbyConveniences(coords);
    const trafficAccidents = await detectNearbyAccidents(coords);

    // Merge into butlerInsight
    const insight = (listing.butlerInsight || {}) as any;
    insight.mapsThreats = mapsThreats;
    insight.mapsConveniences = mapsConveniences;
    insight.trafficAccidents = trafficAccidents;

    // Save coordinates and recalculated insights to database
    await db.listing.update({
      where: { id: listing.id },
      data: {
        lat: coords.lat,
        lng: coords.lng,
        butlerInsight: insight
      }
    });

    console.log(`Successfully updated listing "${listing.title}" with correct local traffic and police stats!`);
    updateCount++;
  }

  console.log(`\n========================================`);
  console.log(`✨ Database migration finished successfully! Recalculated ${updateCount} listings.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    process.exit(0);
  });
