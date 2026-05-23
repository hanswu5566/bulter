import { db } from "./db";
import { redis } from "./redis";
import rentStatsRaw from "../config/rent_stats_11409.json";
import fs from "fs";
import path from "path";

const rentStats = rentStatsRaw as Record<string, Record<string, Array<{
  type: string;
  age: string;
  count: number;
  p25: number;
  p50: number;
  p75: number;
}>>>;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat1 - lat2) * 111000;
  const dLng = (lng1 - lng2) * 100000;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

interface Location {
  lat: number;
  lng: number;
}

interface TrafficStatsCell {
  a1: number;
  a2: number;
  streets: string[];
  causes: string[];
  types: string[];
}

let trafficStats: Record<string, TrafficStatsCell> | null = null;

function loadTrafficStats() {
  if (trafficStats) return trafficStats;
  try {
    const filePath = path.join(process.cwd(), "src/config/traffic_grid_stats.json");
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      trafficStats = JSON.parse(fileContent);
      console.log(`[Traffic Stats] Loaded ${Object.keys(trafficStats || {}).length} grid cells.`);
    } else {
      console.warn("[Traffic Stats] JSON file not found at:", filePath);
      trafficStats = {};
    }
  } catch (err) {
    console.error("Failed to load traffic stats JSON:", err);
    trafficStats = {};
  }
  return trafficStats;
}

export async function detectNearbyAccidents(location: Location) {
  const { lat, lng } = location;

  // 1. Load the pre-aggregated grid database (lazy loading)
  const statsDb = loadTrafficStats() || {};

  // 2. Query the 3x3 grid cells (~300m x 300m area) around the location
  const centerLat = Math.round(lat * 1000) / 1000;
  const centerLng = Math.round(lng * 1000) / 1000;

  let totalA1 = 0;
  let totalA2 = 0;
  const streetFreq: Record<string, number> = {};
  const causeFreq: Record<string, number> = {};
  const typeFreq: Record<string, number> = {};

  const hotspots: any[] = [];

  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const cellLat = parseFloat((centerLat + dLat * 0.001).toFixed(3));
      const cellLng = parseFloat((centerLng + dLng * 0.001).toFixed(3));
      const key = `${cellLat.toFixed(3)}_${cellLng.toFixed(3)}`;
      const cell = statsDb[key];
      if (cell) {
        const cellA1 = cell.a1 || 0;
        const cellA2 = cell.a2 || 0;
        
        totalA1 += cellA1;
        totalA2 += cellA2;

        hotspots.push({
          lat: cellLat,
          lng: cellLng,
          a1: cellA1,
          a2: cellA2,
          streets: cell.streets || []
        });

        (cell.streets || []).forEach(s => {
          streetFreq[s] = (streetFreq[s] || 0) + 1;
        });
        (cell.causes || []).forEach(c => {
          causeFreq[c] = (causeFreq[c] || 0) + 1;
        });
        (cell.types || []).forEach(t => {
          typeFreq[t] = (typeFreq[t] || 0) + 1;
        });
      }
    }
  }

  // 3. Determine top matching stats
  const topStreets = Object.entries(streetFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const topCauses = Object.entries(causeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const topTypes = Object.entries(typeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // 4. Assess safety level based on aggregated counts (Optimized for Taiwan's high-density urban traffic)
  let safetyRating = "安全";
  let safetyLevel = "green"; // green, yellow, red
  let description = "周邊交通秩序優良，無重大事故頻繁記錄。";

  // 🟡 注意 (Yellow): 有 1 件 A1 死亡車禍，或者全年度累積 A2 受傷車禍在 10 到 30 件之間 (約每月 1-2.5 件)
  if (totalA1 === 1 || (totalA2 >= 10 && totalA2 < 30)) {
    safetyRating = "注意";
    safetyLevel = "yellow";
    description = "周邊有些許行車事故記錄，出門建議減速慢行並注意安全。";
  }
  
  // 🔴 危險 (Red): 有大於等於 2 件 A1 死亡車禍，或者全年度累積 A2 受傷車禍大於 30 件
  if (totalA1 >= 2 || totalA2 >= 30) {
    safetyRating = "危險";
    safetyLevel = "red";
    description = "本街區為交通事故頻繁區域，周邊包含易肇事路口，行車與夜間外出需特別警惕！";
  }

  return {
    a1Count: totalA1,
    a2Count: totalA2,
    streets: topStreets,
    causes: topCauses,
    types: topTypes,
    safetyRating,
    safetyLevel,
    description,
    hotspots
  };
}

export async function detectNearbyThreats(location: Location) {
  const { lat, lng } = location;
  
  // 1. Caching defense layer using Redis and Geo-Hashing (100m grid)
  const gridLat = lat.toFixed(3);
  const gridLng = lng.toFixed(3);
  const cacheKey = `maps:threats:${gridLat}:${gridLng}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis Cache Hit] Maps threats for grid: ${gridLat}, ${gridLng}`);
      return JSON.parse(cachedData);
    }
  } catch (cacheErr) {
    console.error("Redis read error in maps threats caching:", cacheErr);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Missing GOOGLE_MAPS_API_KEY. Skipping real maps integration.");
    return null;
  }

  const radius = 100; // 搜尋方圓 100 公尺
  const mergedKeywords = "廟|宮|壇|消防|醫院|夜市|熱炒|市場|垃圾|停車|加油";

  const keywordsMap = [
    { pattern: "廟", type: "noise", keyword: "廟" },
    { pattern: "宮", type: "noise", keyword: "宮" },
    { pattern: "壇", type: "noise", keyword: "壇" },
    { pattern: "消防", type: "noise", keyword: "消防隊" },
    { pattern: "醫院", type: "noise", keyword: "醫院" },
    { pattern: "夜市", type: "smell", keyword: "夜市" },
    { pattern: "熱炒", type: "smell", keyword: "熱炒" },
    { pattern: "市場", type: "smell", keyword: "市場" },
    { pattern: "垃圾", type: "smell", keyword: "垃圾" },
    { pattern: "停車", type: "traffic", keyword: "停車場" },
    { pattern: "加油", type: "traffic", keyword: "加油站" }
  ];

  const threats: any[] = [];

  try {
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.types,places.formattedAddress,places.location",
        "X-Goog-User-Locale": "zh-TW",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"
      },
      body: JSON.stringify({
        includedTypes: ["church", "fire_station", "hospital", "gas_station", "parking", "tourist_attraction", "market"],
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: radius
          }
        },
        maxResultCount: 20
      })
    });
    
    const data = await res.json();
    console.log(`[Places API Threats] GPS: ${lat}, ${lng}. Status: ${res.status}, Found Places: ${data.places?.length || 0}`);
    if (res.status !== 200) {
      console.error("[Places API Threats Error]:", JSON.stringify(data));
    }

    if (data.places && data.places.length > 0) {
      data.places.forEach((place: any) => {
        const placeName = place.displayName?.text || "";
        const placeLat = place.location?.latitude;
        const placeLng = place.location?.longitude;
        const placeTypes = place.types || [];
        
        if (placeLat && placeLng) {
          const actualDist = getDistance(lat, lng, placeLat, placeLng);
          if (actualDist <= radius) {
            let matchedType = "other";
            let matchedKeyword = "周邊設施";
            
            if (placeTypes.includes("place_of_worship")) {
              matchedType = "noise";
              matchedKeyword = "宮廟宮壇";
            } else if (placeTypes.includes("fire_station")) {
              matchedType = "noise";
              matchedKeyword = "消防隊";
            } else if (placeTypes.includes("hospital")) {
              matchedType = "noise";
              matchedKeyword = "醫院";
            } else if (placeTypes.includes("gas_station")) {
              matchedType = "traffic";
              matchedKeyword = "加油站";
            } else if (placeTypes.includes("parking")) {
              matchedType = "traffic";
              matchedKeyword = "停車場";
            } else if (placeTypes.includes("tourist_attraction") || placeTypes.includes("market")) {
              matchedType = "smell";
              matchedKeyword = "夜市市場";
            }
            
            if (matchedType !== "other") {
              threats.push({
                name: placeName,
                type: matchedType,
                distance: `${Math.round(actualDist)}m`,
                vicinity: place.formattedAddress || "",
                keyword: matchedKeyword,
                lat: placeLat,
                lng: placeLng
              });
            }
          }
        }
      });
    }

    // 2. Save to cache for 7 days (604800 seconds) to prevent duplicate charges
    try {
      await redis.set(cacheKey, JSON.stringify(threats), "EX", 604800);
      console.log(`[Redis Cache Set] Saved Maps threats for grid: ${gridLat}, ${gridLng}`);
    } catch (cacheErr) {
      console.error("Redis write error in maps threats caching:", cacheErr);
    }

    return threats;
  } catch (error) {
    console.error("Failed to call Google Maps API:", error);
    return null;
  }
}

export async function detectNearbyConveniences(location: Location) {
  const { lat, lng } = location;
  
  const gridLat = lat.toFixed(3);
  const gridLng = lng.toFixed(3);
  const cacheKey = `maps:conveniences:${gridLat}:${gridLng}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis Cache Hit] Maps conveniences for grid: ${gridLat}, ${gridLng}`);
      return JSON.parse(cachedData);
    }
  } catch (cacheErr) {
    console.error("Redis read error in maps conveniences caching:", cacheErr);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Missing GOOGLE_MAPS_API_KEY. Skipping real maps integration.");
    return null;
  }

  const radius = 1500; 
  const keywordsMap = [
    { pattern: "捷運", type: "transit", keyword: "捷運站" },
    { pattern: "全聯", type: "shopping", keyword: "全聯福利中心" },
    { pattern: "7-11", type: "shopping", keyword: "7-11" },
    { pattern: "全家", type: "shopping", keyword: "全家超商" },
    { pattern: "萊爾富", type: "shopping", keyword: "萊爾富超商" },
    { pattern: "OK", type: "shopping", keyword: "OK超商" },
    { pattern: "公園", type: "leisure", keyword: "公園" },
    { pattern: "星巴克", type: "food", keyword: "星巴克" },
    { pattern: "麥當勞", type: "food", keyword: "麥當勞" },
    { pattern: "百貨", type: "shopping", keyword: "百貨公司" },
    { pattern: "SOGO", type: "shopping", keyword: "百貨公司" },
    { pattern: "三越", type: "shopping", keyword: "百貨公司" },
    { pattern: "遠東", type: "shopping", keyword: "百貨公司" },
    { pattern: "大遠百", type: "shopping", keyword: "百貨公司" },
    { pattern: "微風", type: "shopping", keyword: "百貨公司" },
    { pattern: "醫院", type: "health", keyword: "醫院" },
    { pattern: "診所", type: "health", keyword: "診所" },
    { pattern: "醫學", type: "health", keyword: "醫學中心" },
    { pattern: "屈臣氏", type: "shopping", keyword: "美妝藥妝" },
    { pattern: "康是美", type: "shopping", keyword: "美妝藥妝" },
    { pattern: "健身", type: "leisure", keyword: "運動健身" },
    { pattern: "運動中心", type: "leisure", keyword: "運動中心" },
    { pattern: "公車", type: "transit", keyword: "公車站牌" },
    { pattern: "站牌", type: "transit", keyword: "公車站牌" },
    { pattern: "學校", type: "leisure", keyword: "鄰近學校" },
    { pattern: "國小", type: "leisure", keyword: "鄰近學校" },
    { pattern: "國中", type: "leisure", keyword: "鄰近學校" },
    { pattern: "高中", type: "leisure", keyword: "鄰近學校" },
    { pattern: "大學", type: "leisure", keyword: "鄰近學校" },
    { pattern: "夜市", type: "food", keyword: "觀光夜市" },
    { pattern: "派出所", type: "police", keyword: "派出所" },
    { pattern: "警察局", type: "police", keyword: "警察局" },
    { pattern: "分局", type: "police", keyword: "分局" }
  ];

  const conveniences: any[] = [];

  try {
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.types,places.formattedAddress,places.location",
        "X-Goog-User-Locale": "zh-TW",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"
      },
      body: JSON.stringify({
        includedTypes: [
          "subway_station", "convenience_store", "supermarket", "department_store", 
          "hospital", "park", "cafe", "restaurant", "police", "school", "bus_station"
        ],
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: radius
          }
        },
        maxResultCount: 20
      })
    });
    
    const data = await res.json();
    console.log(`[Places API Conveniences] GPS: ${lat}, ${lng}. Status: ${res.status}, Found Places: ${data.places?.length || 0}`);
    if (res.status !== 200) {
      console.error("[Places API Conveniences Error]:", JSON.stringify(data));
    }

    if (data.places && data.places.length > 0) {
      data.places.forEach((place: any) => {
        const placeName = place.displayName?.text || "";
        const placeLat = place.location?.latitude;
        const placeLng = place.location?.longitude;
        const placeTypes = place.types || [];
        
        if (placeLat && placeLng) {
          const actualDist = getDistance(lat, lng, placeLat, placeLng);
          if (actualDist <= radius) {
            let matchedType = "other";
            let matchedKeyword = "周邊機能";
            
            if (placeTypes.includes("subway_station")) {
              matchedType = "transit";
              matchedKeyword = "捷運站";
            } else if (placeTypes.includes("bus_station")) {
              matchedType = "transit";
              matchedKeyword = "公車站牌";
            } else if (placeTypes.includes("convenience_store")) {
              matchedType = "shopping";
              matchedKeyword = "便利超商";
            } else if (placeTypes.includes("supermarket")) {
              matchedType = "shopping";
              matchedKeyword = "超級市場";
            } else if (placeTypes.includes("department_store")) {
              matchedType = "shopping";
              matchedKeyword = "百貨公司";
            } else if (placeTypes.includes("hospital")) {
              matchedType = "health";
              matchedKeyword = "大型醫院";
            } else if (placeTypes.includes("police")) {
              matchedType = "police";
              matchedKeyword = "派出所警局";
            } else if (placeTypes.includes("park")) {
              matchedType = "leisure";
              matchedKeyword = "休閒公園";
            } else if (placeTypes.includes("school")) {
              matchedType = "leisure";
              matchedKeyword = "鄰近學校";
            } else if (placeTypes.includes("cafe")) {
              matchedType = "food";
              matchedKeyword = "星巴克咖啡";
            } else if (placeTypes.includes("restaurant")) {
              matchedType = "food";
              matchedKeyword = "連鎖餐飲";
            }
            
            if (matchedType !== "other") {
              const exists = conveniences.some(c => c.name === placeName);
              if (!exists) {
                conveniences.push({
                  name: placeName,
                  type: matchedType,
                  distance: actualDist < 1000 ? `${Math.round(actualDist)}m` : `${(actualDist / 1000).toFixed(1)}km`,
                  vicinity: place.formattedAddress || "",
                  keyword: matchedKeyword,
                  lat: placeLat,
                  lng: placeLng
                });
              }
            }
          }
        }
      });
    }

    try {
      await redis.set(cacheKey, JSON.stringify(conveniences), "EX", 604800);
      console.log(`[Redis Cache Set] Saved Maps conveniences for grid: ${gridLat}, ${gridLng}`);
    } catch (cacheErr) {
      console.error("Redis write error in maps conveniences caching:", cacheErr);
    }

    return conveniences;
  } catch (error) {
    console.error("Failed to call Google Maps API for conveniences:", error);
    return null;
  }
}

const parseCityAndDistrict = (address: string) => {
  if (!address) return { city: "台北市", district: "大安區" };
  
  const cleanAddress = address.replace(/臺/g, "台");
  const match = cleanAddress.match(/(台北市|新北市|桃園市|台中市|台南市|高雄市)?([^\s\d]+?(區|市|鎮|鄉))/);
  
  let city = "台北市";
  let district = "大安區";
  
  if (match) {
    if (match[1]) city = match[1];
    if (match[2]) district = match[2];
  } else {
    const distMatch = cleanAddress.match(/([^\s\d]+?(區|市|鎮|鄉))/);
    if (distMatch) {
      district = distMatch[1];
    }
  }
  
  return { city, district };
};

const TYPICAL_SIZES: Record<string, number> = {
  "整層住家": 20, // Highly realistic average rented apartment size in Taiwan
  "獨立套房": 8,
  "分租套房": 6,
  "雅房": 4,
  "不分類": 12
};

export async function getRealPriceComparison(address: string, type: string, size?: number, elevator?: boolean) {
  try {
    const { city, district } = parseCityAndDistrict(address);
    
    const cityData = rentStats[city];
    const districtData = cityData ? cityData[district] : null;
    
    let averagePrice = 85000;
    let p25 = 65000;
    let p75 = 105000;
    let source = "內政部 114 年 9 月租金四分位數統計 (電梯自適應校正)";
    let found = false;
    let sizeAdjustment = null;

    if (districtData && districtData.length > 0) {
      let record = null;
      
      // 1. Dynamic Elevator Routing: Compare elevator buildings to new stats (<30), and walk-ups to old stats (30)
      if (elevator === true) {
        record = districtData.find(r => r.type === type && r.age === "<30");
      } else if (elevator === false) {
        record = districtData.find(r => r.type === type && r.age === "30");
      }
      
      // Fallback routing chain
      if (!record) {
        record = districtData.find(r => r.type === type && r.age === "不分類");
      }
      if (!record) {
        record = districtData.find(r => r.type === type);
      }
      if (!record) {
        record = districtData.find(r => r.type === "不分類" && r.age === "不分類");
      }

      if (record) {
        const matchedType = record.type || "不分類";
        const baseSize = TYPICAL_SIZES[matchedType] || 15;
        
        // Standard calculations
        const rawP25 = record.p25;
        const rawP50 = record.p50;
        const rawP75 = record.p75;
        
        if (size && size > 0) {
          // Calculate dynamic size-adjusted unit pricing per ping
          const unitP25 = rawP25 / baseSize;
          const unitP50 = rawP50 / baseSize;
          const unitP75 = rawP75 / baseSize;
          
          averagePrice = Math.round(unitP50 * size);
          p25 = Math.round(unitP25 * size);
          p75 = Math.round(unitP75 * size);
          sizeAdjustment = {
            size,
            baseSize,
            unitPricePerPing: Math.round(unitP50),
            rawP50
          };
        } else {
          // Fallback to normal non-adjusted total rent
          averagePrice = rawP50;
          p25 = rawP25;
          p75 = rawP75;
        }
        found = true;
      }
    }

    return {
      averagePrice,
      p25,
      p75,
      city,
      district,
      source,
      found,
      sizeAdjustment
    };
  } catch (e) {
    console.error("Failed to fetch real price comparison:", e);
    return {
      averagePrice: 85000,
      p25: 65000,
      p75: 105000,
      city: "台北市",
      district: "大安區",
      source: "內政部 114 年 9 月租金統計 (兜底數據)",
      found: false
    };
  }
}

export async function getNearbyGeoCache(location: Location) {
  const { lat, lng } = location;
  try {
    // Search within ~150 meters (0.0015 degrees)
    const nearbyListing = await db.listing.findFirst({
      where: {
        lat: {
          gte: lat - 0.0015,
          lte: lat + 0.0015
        },
        lng: {
          gte: lng - 0.0015,
          lte: lng + 0.0015
        }
      }
    });

    if (nearbyListing && nearbyListing.butlerInsight) {
      const insight = nearbyListing.butlerInsight as any;
      if (insight && insight.mapsThreats && insight.mapsConveniences) {
        console.log(`[Geo-Cache Share Hit] Found nearby listing within 150m: "${nearbyListing.title}". Sharing Google Maps results to save API charges!`);
        return {
          mapsThreats: insight.mapsThreats,
          mapsConveniences: insight.mapsConveniences
        };
      }
    }
  } catch (err) {
    console.error("Failed to query nearby listing geocache:", err);
  }
  return null;
}

export async function geocodeAddress(address: string): Promise<Location | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng
      };
    } else {
      console.warn(`[Geocoding] Failed to geocode address "${address}":`, data.status);
    }
  } catch (err) {
    console.error("[Geocoding] API call failed:", err);
  }
  return null;
}

export function getCityFallbackCoords(address: string): { lat: number; lng: number } | null {
  if (!address) return null;
  
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    "台北": { lat: 25.0374, lng: 121.5645 },
    "臺北": { lat: 25.0374, lng: 121.5645 },
    "新北": { lat: 25.0143, lng: 121.4672 },
    "桃園": { lat: 24.9931, lng: 121.3010 },
    "台中": { lat: 24.1627, lng: 120.6404 },
    "臺中": { lat: 24.1627, lng: 120.6404 },
    "台南": { lat: 22.9971, lng: 120.2126 },
    "臺南": { lat: 22.9971, lng: 120.2126 },
    "高雄": { lat: 22.6273, lng: 120.3014 },
    "基隆": { lat: 25.1283, lng: 121.7419 },
    "新竹": { lat: 24.8138, lng: 120.9675 },
    "苗栗": { lat: 24.5602, lng: 120.8207 },
    "彰化": { lat: 24.0518, lng: 120.5161 },
    "南投": { lat: 23.9155, lng: 120.6805 },
    "雲林": { lat: 23.6993, lng: 120.5263 },
    "嘉義": { lat: 23.4800, lng: 120.4491 },
    "屏東": { lat: 22.5515, lng: 120.5488 },
    "宜蘭": { lat: 24.7021, lng: 121.7378 },
    "花蓮": { lat: 23.9872, lng: 121.6016 },
    "台東": { lat: 22.7972, lng: 121.1139 },
    "臺東": { lat: 22.7972, lng: 121.1139 },
    "澎湖": { lat: 23.5711, lng: 119.5794 },
    "金門": { lat: 24.4482, lng: 118.3785 },
    "連江": { lat: 26.1592, lng: 119.9497 }
  };

  for (const [city, coord] of Object.entries(cityCoords)) {
    if (address.includes(city)) {
      return coord;
    }
  }
  return null;
}



