import fs from "fs";
import path from "path";
const pdf = require("pdf-parse");

interface RentRecord {
  type: string;
  age: string;
  count: number;
  p25: number;
  p50: number;
  p75: number;
}

interface DistrictData {
  districtName: string;
  records: RentRecord[];
}

interface CityData {
  cityName: string;
  districts: Record<string, RentRecord[]>;
}

async function parsePDFs() {
  const rentStats: Record<string, Record<string, RentRecord[]>> = {};

  console.log("Reading and parsing rent.pdf...");
  const rentBuffer = fs.readFileSync("./rent.pdf");
  const parser = new pdf.PDFParse({ data: rentBuffer });
  const rentData = await parser.getText();
  const lines = rentData.text.split("\n");

  let currentCity = "";
  let currentDistrict = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. 匹配行政區邊界 (例如: "1 新北市 八里區" 或 "15 臺北市 大安區")
    const districtMatch = line.match(/^\d+\s+([^\s]+)\s+([^\s]+)\s*$/);
    if (districtMatch) {
      currentCity = districtMatch[1].replace("臺", "台"); // 統一使用 "台" 字
      currentDistrict = districtMatch[2];
      
      if (!rentStats[currentCity]) {
        rentStats[currentCity] = {};
      }
      if (!rentStats[currentCity][currentDistrict]) {
        rentStats[currentCity][currentDistrict] = [];
      }
      continue;
    }

    // 2. 排除標頭行或無效行
    if (line.includes("編號") || line.includes("行政區") || line.includes("四分位數") || line.includes("分位")) {
      continue;
    }

    // 3. 匹配數據行
    // 我們使用空格切割，因為數據行末尾一定是 4 個數字，前面是 1 個或多個文字組成的類別
    const tokens = line.split(/\s+/);
    if (tokens.length >= 6) {
      const last4 = tokens.slice(-4);
      // 驗證最後 4 個 token 是否是數字或含逗號的數字
      const isNumeric = last4.every((t: string) => /^\d{1,3}(,\d{3})*$/.test(t) || /^\d+$/.test(t));
      
      if (isNumeric && currentCity && currentDistrict) {
        const p75 = parseInt(last4[3].replace(/,/g, ""), 10);
        const p50 = parseInt(last4[2].replace(/,/g, ""), 10);
        const p25 = parseInt(last4[1].replace(/,/g, ""), 10);
        const count = parseInt(last4[0].replace(/,/g, ""), 10);

        const type = tokens[0];
        const age = tokens.slice(1, -4).join(" ");

        // 標準化型態與屋齡命名，對齊專案規格與比對邏輯
        let standardType = type;
        if (type === "整戶(層)") standardType = "整層住家";
        if (type === "分租套(雅)房") standardType = "雅房"; // 降級或對齊

        let standardAge = age;
        if (age === "30 年以上") standardAge = "30";
        if (age === "未滿 30 年") standardAge = "<30";

        rentStats[currentCity][currentDistrict].push({
          type: standardType,
          age: standardAge,
          count,
          p25,
          p50,
          p75
        });
      }
    }
  }

  // 4. 寫入 JSON 檔案
  const targetDir = path.join(__dirname, "../src/config");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const targetFile = path.join(targetDir, "rent_stats_11409.json");
  fs.writeFileSync(targetFile, JSON.stringify(rentStats, null, 2), "utf-8");
  
  console.log(`Successfully parsed rent.pdf. Saved ${Object.keys(rentStats).length} cities to ${targetFile}`);
  
  // 輸出台北市與新北市的部分數據做驗證
  if (rentStats["台北市"]) {
    console.log("\n[Validation] Taipei City districts parsed:", Object.keys(rentStats["台北市"]));
    if (rentStats["台北市"]["大安區"]) {
      console.log("Daan District sample records:", rentStats["台北市"]["大安區"].slice(0, 3));
    }
  }
}

parsePDFs().catch(console.error);
