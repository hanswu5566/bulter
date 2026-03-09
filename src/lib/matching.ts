import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function calculateMatchScore(userTags: string[], listingData: any) {
  if (!userTags || userTags.length === 0) return 70; // Default score

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Compare the following tenant preferences with the rental listing details.
    Tenant Preferences: ${userTags.join(", ")}
    
    Listing Details:
    - Title: ${listingData.title}
    - Address: ${listingData.address}
    - Features: ${JSON.stringify(listingData.features)}
    - Description: ${listingData.description}
    
    Calculate a match score from 0 to 100 based on how well the listing meets the tenant's needs.
    Provide ONLY the numerical score as output.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const score = parseInt(text.match(/\d+/)?.[0] || "70");
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error("Match score error:", error);
    return 75;
  }
}
