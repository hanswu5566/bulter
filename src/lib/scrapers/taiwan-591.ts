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
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
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
      } catch (e) {}
    });

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
      lng
    };
  } catch (error) {
    console.error("591 Scraper error:", error);
    throw error;
  }
}
