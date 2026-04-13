import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Optimal model allocation
export const MODELS = {
  VISION: "gemini-3-flash-preview",      // High performance Flash
  STANDARD: "gemini-3-flash-preview",    // Expert reasoning
  LITE: "gemini-3.1-flash-lite-preview", // Ultra-fast Lite
};

// --- Agent Tools Definition ---
export const BUTLER_TOOLS = [
  {
    function_declarations: [
      {
        name: "update_user_tags",
        description: "Update the user's lifestyle preferences, budget, or property requirements in the database. Use this as soon as the user expresses a preference.",
        parameters: {
          type: "object",
          properties: {
            tags: {
              type: "object",
              description: "Structured tags representing user needs. Example: { budget: 20000, region: 'Taipei', pets: true, quietness: 5 }",
            },
          },
          required: ["tags"],
        },
      },
      {
        name: "finalize_interview",
        description: "Call this tool when the interview is complete and enough information has been collected to provide accurate recommendations.",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "A short closing summary of what was learned about the user.",
            },
          },
          required: ["summary"],
        },
      },
    ],
  },
];

/**
 * Helper to sleep for a given duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrapper for generateContent with automatic retry on 429
 */
async function generateWithRetry(model: any, prompt: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error: any) {
      if (error?.status === 429 && i < retries - 1) {
        console.warn(`Gemini API 429 (Rate Limit). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

/**
 * Utility to extract and parse JSON from AI response
 */
function parseAIJson<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error("AI JSON Parse Error:", e, "Raw text:", text);
    return null;
  }
}

export async function parseListingWithAI(content: string, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });

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
        "type": "独立套房" | "分租套房" | "雅房" | "整層住家",
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
    ${content.substring(0, 250000)}
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<any>(result?.response.text() || "");
}

export async function diagnoseMatchWithAI(userTags: string[], listing: any, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });

  const prompt = `
    You are Butler, an AI rental assistant. 
    Analyze the compatibility between a tenant's lifestyle tags and a property listing.
    All text output (summary, tags, facts) MUST be in the language for locale: ${locale}.

    Tenant Tags: ${userTags.join(", ")}
    
    Property Details:
    - Title: ${listing.title}
    - Price: ${listing.price}
    - Features: ${JSON.stringify(listing.features)}
    - Description: ${listing.description?.substring(0, 1000)}

    TASK:
    1. Calculate a match score (0-100).
    2. Write a concise summary (under 60 words).
    3. Map the tenant's tags to specific listing facts. 
       - status: "MATCH", "MISMATCH", or "UNKNOWN"
    
    RETURN ONLY JSON:
    {
      "score": Number,
      "summary": "String",
      "mapping": [
        { "req": "User requirement (translated)", "fact": "Property fact (translated)", "status": "MATCH" }
      ]
    }
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<any>(result?.response.text() || "");
}

export async function optimizeListingWithAI(listing: any, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });

  const prompt = `
    You are Butler, an AI real estate marketing expert. 
    Analyze this property listing and provide specific improvement suggestions for the landlord.
    All suggestions MUST be in the language for locale: ${locale}.

    Property Details:
    - Title: ${listing.title}
    - Price: ${listing.price}
    - Address: ${listing.address}
    - Features: ${JSON.stringify(listing.features)}
    - Description: ${listing.description?.substring(0, 2000)}

    TASK:
    1. Identify missing critical information.
    2. Suggest SEO improvements for the title.
    3. Provide "Bonus Tips" to make the listing more appealing.
    
    RETURN ONLY JSON:
    {
      "suggestions": [
        { "type": "MISSING" | "SEO" | "BONUS" | "DONE", "title": "Issue Title", "content": "Detailed advice", "status": "❌" | "⚠️" | "✅" | "💡" }
      ]
    }
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<any>(result?.response.text() || "");
}

export async function generateInspectionGuideWithAI(listing: any, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });

  const prompt = `
    You are Butler, an expert home inspector. 
    Analyze this listing and provide 3-5 critical inspection points for a tenant visiting in person.
    Focus on hidden risks (e.g., top floor leaks, old pipes).
    All advice MUST be in the language for locale: ${locale}.

    Property Details:
    - Title: ${listing.title}
    - Type: ${listing.features?.type}
    - Floor: ${listing.features?.floor} / ${listing.features?.totalFloor}
    - Description: ${listing.description?.substring(0, 1000)}

    TASK:
    Generate a checklist of what to look for during a physical visit.
    
    RETURN ONLY JSON:
    {
      "points": [
        { "title": "Inspection Item", "advice": "What to do and why" }
      ]
    }
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<any>(result?.response.text() || "");
}

export async function analyzeInspectionPhoto(base64Image: string, taskName: string, locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.VISION });

  const prompt = `
    You are a professional rental house inspector (Butler).
    Analyze this photo for: "${taskName}".
    Identify issues like water stains, cracks, mold, or safety hazards.
    Provide a concise, helpful summary in the language for locale: ${locale}.
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

  return result?.response.text() || "";
}

export async function extractIntentFromChat(messages: { role: string; content: string }[], locale: string = "zh-TW") {
  const model = genAI.getGenerativeModel({ model: MODELS.LITE });
  const history = messages.map(m => `${m.role}: ${m.content}`).join("\n");

  const prompt = `
    Analyze this butler-tenant chat.
    Extract preferences, budget, location, and lifestyle needs.
    Return a JSON array of short descriptive tags.
    Language of tags MUST be associated with locale: ${locale}.
    Example for zh-TW: ["喜歡安靜", "近捷運", "預算2萬以下"]

    History:
    ${history}
  `;

  const result = await generateWithRetry(model, prompt);
  return parseAIJson<string[]>(result?.response.text() || "") || [];
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
