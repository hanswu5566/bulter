import dotenv from "dotenv";
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

async function test() {
  console.log("Testing Google Places API Key:", GOOGLE_MAPS_API_KEY ? "PRESENT (AIzaSy...)" : "MISSING!");
  if (!GOOGLE_MAPS_API_KEY) return;

  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const lat = 25.0143;
  const lng = 121.4672;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.types,places.formattedAddress,places.location"
      },
      body: JSON.stringify({
        includedTypes: ["subway_station", "supermarket", "convenience_store", "department_store", "hospital", "park", "cafe", "restaurant", "police"],
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 1500.0
          }
        },
        maxResultCount: 15
      })
    });

    const text = await res.text();
    console.log("\nStatus:", res.status);
    console.log("Response:");
    console.log(text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
