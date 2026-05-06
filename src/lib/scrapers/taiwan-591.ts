import * as cheerio from "cheerio";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15"
];

export async function scrape591(url: string) {
  try {
    // 增加隨機延遲 500ms - 1500ms，模擬真人行為
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": randomUA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://rent.591.com.tw/?kind=0&region=1", // 模擬從搜尋列表頁進來
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
    });
    
    if (!response.ok) {
      throw new Error(`無法存取 591 頁面: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 1. 抓取關鍵元數據
    const title = $('title').text().replace(" - 591租屋網", "");
    const ogImage = $('meta[property="og:image"]').attr('content');
    
    // 2. 擷取所有房源照片 (591 圖片路徑特徵)
    // 591 的圖片網址在 HTML 中常會被轉義成 https:\/\/img1.591.com.tw\/... 或使用 \u002F
    // 我們先將常見的轉義字元還原，再進行匹配以提高準確度
    const normalizedHtml = html
      .replace(/\\u002f/gi, '/')
      .replace(/\\u003a/gi, ':')
      .replace(/\\\//g, '/');

    const imageMap = new Map<string, string>();

    // 方法 A: 解析 JSON-LD (最穩定，SEO 標準格式)
    const ruleData: any = {
      title: "",
      price: 0,
      address: "",
      size: "",
      floor: "",
      type: "",
      amenities: [],
      description: ""
    };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonRaw = JSON.parse($(el).html() || '{}');
        const jsonList = Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];

        jsonList.forEach(json => {
          // 提取圖片
          const images = json.image || json.photos || [];
          if (Array.isArray(images)) {
            images.forEach(img => {
              if (typeof img === 'string' && img.includes('591.com.tw')) {
                imageMap.set(img.split('!')[0], img);
              }
            });
          } else if (typeof images === 'string' && images.includes('591.com.tw')) {
            imageMap.set(images.split('!')[0], images);
          }

          // 提取硬性欄位 (SEO 資料)
          if (json['@type'] === 'Product' || json['@type'] === 'Accommodation' || json['@type'] === 'Place') {
            if (json.name) ruleData.title = json.name;
            if (json.description) ruleData.description = json.description;
            if (json.offers && json.offers.price) ruleData.price = parseFloat(json.offers.price);
            if (json.address) ruleData.address = json.address.streetAddress || json.address.name || json.address;
          }
        });
      } catch (e) {}
    });

    // 備援：使用 Cheerio 從 DOM 提取硬性欄位 (針對 591 特徵)
    if (!ruleData.title) ruleData.title = $('title').text().replace(" - 591租屋網", "");
    
    // 尋找坪數 (通常包含 "坪")
    const sizeMatch = $('body').text().match(/([0-9.]+)\s*坪/);
    if (sizeMatch) ruleData.size = sizeMatch[1];

    // 尋找樓層 (通常包含 "樓")
    const floorMatch = $('body').text().match(/([0-9]+)\s*樓\s*\/\s*([0-9]+)\s*樓/);
    if (floorMatch) {
      ruleData.floor = `${floorMatch[1]}/${floorMatch[2]}`;
    }

    // 使用 Cheerio 從 DOM 提取設備 (針對 591 特徵，排除刪除項)
    $('.facility.service-facility dl').each((_, el) => {
      const $dl = $(el);
      const isDel = $dl.hasClass('del');
      let text = $dl.find('dd.text').text().trim();
      
      if (text && !isDel) {
        // 名稱映射，對齊用戶偏好的標籤
        if (text === "床") text = "床組";
        if (text === "桌椅") text = "書桌";
        if (text === "1陽台") text = "陽台";
        
        ruleData.amenities.push(text);
      }
    });

    // 如果精準抓取失敗，使用關鍵字掃描備援
    if (ruleData.amenities.length === 0) {
      const KNOWN_AMENITIES = ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "床", "衣櫃", "書桌", "沙發", "茶几", "餐桌", "飲水機", "微波爐", "電梯", "陽台", "網路", "第四台", "天然瓦斯", "桌椅"];
      const bodyTextForRules = $('body').text();
      KNOWN_AMENITIES.forEach(app => {
        if (bodyTextForRules.includes(app)) {
          let mappedApp = app;
          if (app === "床") mappedApp = "床組";
          if (app === "桌椅") mappedApp = "書桌";
          ruleData.amenities.push(mappedApp);
        }
      });
    }

    ruleData.images = Array.from(imageMap.values());

    // 方法 B: 寬鬆 Regex 匹配 (作為備援)
    const imageRegex = /https?:\/\/[a-z0-9.]+\.591\.com\.tw\/house\/[0-9]{4}\/[0-9/]+\/[0-9]+[^\"' \n\r<>\\)]+/g;
    const imageMatches = normalizedHtml.match(imageRegex) || [];
    
    imageMatches.forEach(fullUrl => {
      const baseUrl = fullUrl.split('!')[0];
      const existingUrl = imageMap.get(baseUrl);
      if (!existingUrl || fullUrl.length > existingUrl.length) {
        imageMap.set(baseUrl, fullUrl);
      }
    });

    const uniqueImages = Array.from(imageMap.values())
      .filter(url => url.includes('/house/'))
      .slice(0, 25);

    // 如果 ogImage 存在，處理轉義後加入
    if (ogImage) {
      const cleanOgImage = ogImage.replace(/\\u002f/gi, '/').replace(/\\u003a/gi, ':').replace(/\\\//g, '/');
      const ogBase = cleanOgImage.split('!')[0];
      if (!imageMap.has(ogBase)) {
        uniqueImages.unshift(cleanOgImage);
      }
    }

    
    // 3. 591 核心數據提取：解析 window.__NUXT__
    let nuxtDataContent = "";
    $('script').each((_, element) => {
      const content = $(element).html();
      if (content?.includes('window.__NUXT__')) {
        const match = content.match(/\(function\(([^)]+)\)\{return ([\s\S]+?)\}\(([\s\S]+?)\)\)/);
        if (match) {
          try {
            const argsStr = match[3];
            const args = new Function(`return [${argsStr}]`)();
            
            // 提取所有有意義的字串（排除過短的 ID 或重複的 URL）
            const meaningfulStrings = args.filter((arg: any) => 
              typeof arg === 'string' && 
              arg.length > 1 && 
              !arg.startsWith('http') && 
              !arg.includes('data-v-')
            );

            // 提取可能的價格數字
            const potentialPrices = args.filter((arg: any) => 
              typeof arg === 'number' && arg > 1000 && arg < 1000000
            );

            nuxtDataContent = `
              TITLE: ${title}
              NUMERIC_DATA: ${potentialPrices.join(", ")}
              KEY_STRINGS: ${meaningfulStrings.join(" | ")}
            `;
          } catch (e) {
            console.error("Nuxt Data Parse Error:", e);
          }
        }
      }
    });

    // 4. 提取經緯度 (591 常用 lat/lng 或 google map 連結)
    let lat = null;
    let lng = null;
    const latMatch = html.match(/"lat":\s*"?([0-9.]+)"?/);
    const lngMatch = html.match(/"lng":\s*"?([0-9.]+)"?/);
    if (latMatch && lngMatch) {
      lat = parseFloat(latMatch[1]);
      lng = parseFloat(lngMatch[1]);
    } else {
       // 備援：搜尋 google 地圖連結中的經緯度
       const mapMatch = html.match(/staticmap\?center=([0-9.]+),([0-9.]+)/);
       if (mapMatch) {
         lat = parseFloat(mapMatch[1]);
         lng = parseFloat(mapMatch[2]);
       }
    }

    // 格式化回傳，對齊 AI Prompt 的標籤
    const combinedContent = `
      MAIN_IMAGE: ${ogImage || "None"}
      COORDINATES: ${lat}, ${lng}
      PROPERTY_PHOTOS:
      ${uniqueImages.join("\n")}
      
      WINDOW_NUXT_DATA:
      ${nuxtDataContent || $("body").text().substring(0, 5000)}
    `;
    
    return {
      rawContent: combinedContent.substring(0, 50000), // 限制在 50k 字元，足夠容納所有關鍵資訊
      source: "TW_591" as const,
      url,
      images: uniqueImages,
      lat,
      lng,
      ruleData
    };
  } catch (error) {
    console.error("591 Scraper error:", error);
    throw error;
  }
}
