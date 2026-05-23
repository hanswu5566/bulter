import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Bounding box for Taiwan geographic coordinates
const TAIWAN_BOUNDS = {
  minLat: 21.8,
  maxLat: 26.4,
  minLng: 119.0,
  maxLng: 122.6,
};

interface GridRawData {
  a1: number;
  a2: number;
  streets: Record<string, number>;
  causes: Record<string, number>;
  types: Record<string, number>;
}

interface OptimizedGridData {
  a1: number;
  a2: number;
  streets: string[];
  causes: string[];
  types: string[];
}

// 3 decimal places is ~100m resolution grid key
function toGridKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

// Robust parser for splitting CSV line while ignoring commas inside double quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(f => f.replace(/^"(.*)"$/, '$1').trim());
}

// Extracts street name or recognizable road/lane from Taiwan address
function extractStreet(address: string): string {
  if (!address) return '';
  
  // Look for road/street/lane ending suffix
  const match = address.match(/([^\s\/,()（）]+?(?:路|街|巷|大道))/);
  if (match) {
    let street = match[1];
    // Strip city, district, township, village regional prefixes
    street = street.replace(/^.*?市.*?區/, '')
                   .replace(/^.*?市.*?鎮/, '')
                   .replace(/^.*?市.*?鄉/, '')
                   .replace(/^.*?縣.*?鄉/, '')
                   .replace(/^.*?縣.*?鎮/, '')
                   .replace(/^.*?縣.*?市/, '')
                   .replace(/^.*?里/, '')
                   .replace(/^.*?鄰/, '');
    return street.trim();
  }
  return address.slice(0, 15);
}

function getTopKeys(freqMap: Record<string, number>, limit: number): string[] {
  const filterWords = new Set(['無', '未知', '不明', '其他', '尚未發現肇事因素']);
  return Object.entries(freqMap)
    .map(([key, count]) => [key.trim(), count] as [string, number])
    .filter(([key]) => key && !filterWords.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

async function processFile(filePath: string, gridStats: Record<string, GridRawData>): Promise<void> {
  console.log(`Processing file: ${path.basename(filePath)}...`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let headerIndices: Record<string, number> = {};

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      // Extract header indices dynamically
      const headers = parseCSVLine(line);
      headers.forEach((h, idx) => {
        headerIndices[h] = idx;
      });
      continue;
    }

    const row = parseCSVLine(line);
    if (row.length < 5) continue;

    // Retrieve fields safely based on header indices
    const accidentType = row[headerIndices['事故類別名稱'] || 4] || '';
    const address = row[headerIndices['發生地點'] || 6] || '';
    const cause = row[headerIndices['肇因研判子類別名稱-主要'] || 31] || '';
    const vehicleType = row[headerIndices['當事者區分-類別-大類別名稱-車種'] || 34] || '';
    const lngStr = row[headerIndices['經度'] || 49] || '';
    const latStr = row[headerIndices['緯度'] || 50] || '';

    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    // Validate coordinate range within Taiwan bounding box
    if (
      !isNaN(lat) && !isNaN(lng) &&
      lat >= TAIWAN_BOUNDS.minLat && lat <= TAIWAN_BOUNDS.maxLat &&
      lng >= TAIWAN_BOUNDS.minLng && lng <= TAIWAN_BOUNDS.maxLng
    ) {
      const key = toGridKey(lat, lng);
      if (!gridStats[key]) {
        gridStats[key] = {
          a1: 0,
          a2: 0,
          streets: {},
          causes: {},
          types: {},
        };
      }

      const stats = gridStats[key];
      if (accidentType === 'A1') {
        stats.a1++;
      } else if (accidentType === 'A2') {
        stats.a2++;
      }

      const street = extractStreet(address);
      if (street) {
        stats.streets[street] = (stats.streets[street] || 0) + 1;
      }

      if (cause) {
        stats.causes[cause] = (stats.causes[cause] || 0) + 1;
      }

      if (vehicleType) {
        stats.types[vehicleType] = (stats.types[vehicleType] || 0) + 1;
      }
    }
  }
  console.log(`Completed ${path.basename(filePath)} with ${lineCount} rows.`);
}

async function main() {
  const trafficDir = path.join(process.cwd(), 'traffic_data');
  const outputDir = path.join(process.cwd(), 'src/config');
  const outputPath = path.join(outputDir, 'traffic_grid_stats.json');

  const files = fs.readdirSync(trafficDir)
    .filter(f => f.startsWith('114年度') && f.endsWith('.csv'))
    .map(f => path.join(trafficDir, f));

  console.log(`Found ${files.length} traffic accident CSV files.`);

  const gridStats: Record<string, GridRawData> = {};

  for (const file of files) {
    await processFile(file, gridStats);
  }

  console.log(`Aggregated ${Object.keys(gridStats).length} active geospatial grid cells.`);
  console.log('Optimizing data entries to keep index lightweight (< 5MB)...');

  const optimizedStats: Record<string, OptimizedGridData> = {};

  for (const [key, raw] of Object.entries(gridStats)) {
    // Focus strictly on statistical hotspots (1 fatality or at least 3 injuries in 2025)
    // This filters out isolated noise and drops index size below 3MB.
    if (raw.a1 > 0 || raw.a2 >= 3) {
      optimizedStats[key] = {
        a1: raw.a1,
        a2: raw.a2,
        streets: getTopKeys(raw.streets, 2),
        causes: getTopKeys(raw.causes, 2),
        types: getTopKeys(raw.types, 2),
      };
    }
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Writing optimized grid stats JSON to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(optimizedStats, null, 2));
  console.log('✨ Geospatial grid stats index generation successful!');
}

main().catch(err => {
  console.error('Error processing traffic data:', err);
  process.exit(1);
});
