import dotenv from "dotenv";
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

async function test() {
  console.log("Testing Google Geocoding API Key:", GOOGLE_MAPS_API_KEY ? "PRESENT" : "MISSING");
  if (!GOOGLE_MAPS_API_KEY) return;

  const address = "新北市鶯歌區鳳福路";
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("\nStatus:", res.status);
    console.log("Geocoding API Status:", data.status);
    if (data.status === "OK") {
      console.log("Resolved Location:", data.results[0].geometry.location);
    } else {
      console.log("Full Response:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
