import dotenv from "dotenv";
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

async function test() {
  console.log("Testing Chinese Places API Key:", GOOGLE_MAPS_API_KEY ? "PRESENT" : "MISSING");
  if (!GOOGLE_MAPS_API_KEY) return;

  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const lat = 25.0491969;
  const lng = 121.4600655;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.types,places.formattedAddress,places.location",
        "X-Goog-User-Locale": "zh-TW",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" // 👈 Add standard HTTP language header!
      },
      body: JSON.stringify({
        includedTypes: ["subway_station", "supermarket", "department_store", "hospital", "park", "cafe", "restaurant", "police", "school"],
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 1500.0
          }
        },
        maxResultCount: 10
      })
    });

    const data = await res.json();
    console.log("\nStatus:", res.status);
    console.log("Chinese Places Names Output:");
    if (data.places && data.places.length > 0) {
      data.places.forEach((p: any, idx: number) => {
        console.log(`  [${idx+1}] ${p.displayName.text} (${p.types[0]})`);
      });
    } else {
      console.log("No places found or error:", data);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
