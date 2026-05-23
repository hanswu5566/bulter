import * as cheerio from "cheerio";
import { genAI, MODELS, generateWithRetry, parseAIJson } from "./config";

export async function parseListingWithAI(content: string, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });

  let cleanContent = content;
  try {
    if (content.includes("<html") || content.includes("<body") || content.includes("<div")) {
      const $ = cheerio.load(content);
      $('script').remove();
      $('style').remove();
      $('svg').remove();
      
      let nuxtData = "";
      $('script').each((_, el) => {
        const html = $(el).html();
        if (html && html.includes('window.__NUXT__')) {
          nuxtData = html.substring(0, 5000);
        }
      });

      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      
      cleanContent = `
        ${nuxtData ? `[核心數據]: ${nuxtData}` : ''}
        [網頁純文字]: ${bodyText.substring(0, 10000)}
      `;
    } else {
      cleanContent = content.substring(0, 10000);
    }
  } catch (e) {
    console.error("Failed to clean HTML, using fallback substring", e);
    cleanContent = content.substring(0, 10000);
  }

  const prompt = `
    You are an elite real estate data engineer. 
    Extract all possible rental details from the provided text into a precise JSON.
    Important: 
    1. Convert prices to clean integers (remove commas).
    2. Translate titles and descriptions to the language associated with locale: ${locale}.
    
    JSON STRUCTURE:
    {
      "title": "String (headline)",
      "price": Number (monthly rent),
      "currency": "TWD" | "JPY" | "USD",
      "address": "String",
      "description": "String",
      "images": ["Array of image URLs found"],
      "features": {
        "type": "獨立套房" | "分租套房" | "雅房" | "整層住家",
        "size": Number (in local units),
        "floor": "String",
        "totalFloor": "String",
        "deposit": "String",
        "managementFee": Number,
        "electricity": "String (billing logic)",
        "water": "String (billing logic)",
        "pets": "allow" | "deny",
        "tax": "allow" | "deny",
        "appliances": ["Array of electronics"],
        "furniture": ["Array of furniture items"],
        "balcony": "none" | "private" | "shared"
      }
    }

    Return ONLY the JSON object.

    Raw Content:
    ${cleanContent}
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<any>(result?.response.text() || "");
}

export async function parseListingFromImage(base64Image: string, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.VISION });

  const prompt = `
    Analyze this real estate listing screenshot.
    Extract details into JSON: title, price, address, description, features.
    Ensure text fields are in the language for locale: ${locale}.
  `;

  const result = await generateWithRetry(model, [
    prompt,
    {
      inlineData: {
        data: base64Image.split(",")[1],
        mimeType: "image/jpeg"
      }
    }
  ]);

  return parseAIJson<any>(result?.response.text() || "");
}
