import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Optimal model allocation (Reverted to highly stable, universally supported Lite models)
export const MODELS = {
  VISION: "gemini-2.5-flash-lite",      // Reverted! 100% stable and supported
  STANDARD: "gemini-2.5-flash-lite",    // Reverted! 100% stable and supported
  LITE: "gemini-2.5-flash-lite",        // Conversational buddy
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateWithRetry(model: any, prompt: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error: any) {
      if ((error?.status === 429 || error?.status === 503) && i < retries - 1) {
        console.warn(`Gemini API ${error.status}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

export function parseAIJson<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error("AI JSON Parse Error:", e, "Raw text:", text);
    return null;
  }
}
