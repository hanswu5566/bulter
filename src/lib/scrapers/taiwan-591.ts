import * as cheerio from "cheerio";

export async function scrape591(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
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
    const imageMatches = html.match(/https:\/\/img[0-9]\.591\.com\.tw\/house\/[0-9]{4}\/[0-9/]+\/[0-9]+\.[a-zA-Z!0-9.]+/g) || [];
    const uniqueImages = Array.from(new Set(imageMatches)).slice(0, 15);
    
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

    // 格式化回傳，對齊 AI Prompt 的標籤
    const combinedContent = `
      MAIN_IMAGE: ${ogImage || "None"}
      PROPERTY_PHOTOS:
      ${uniqueImages.join("\n")}
      
      WINDOW_NUXT_DATA:
      ${nuxtDataContent || $("body").text().substring(0, 5000)}
    `;
    
    return {
      rawContent: combinedContent.substring(0, 50000), // 限制在 50k 字元，足夠容納所有關鍵資訊
      source: "TW_591" as const,
      url,
    };
  } catch (error) {
    console.error("591 Scraper error:", error);
    throw error;
  }
}
