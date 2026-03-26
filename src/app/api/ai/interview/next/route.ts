import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { genAI, MODELS } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { history = [], role = "TENANT", locale = "zh-TW" } = await req.json();
    const model = genAI.getGenerativeModel({ model: MODELS.LITE });

    const systemPrompt = role === "TENANT" ? `
      You are the Interview Navigator for Butler. Your goal is to understand a tenant's lifestyle and housing needs through a detailed conversation.
      CRITICAL: All text fields in the JSON response (question, options) MUST be in the language associated with locale: ${locale}.
      
      STRATEGY:
      1. First question: ALWAYS ask about "Living Composition" (alone, couple, family, etc.).
      2. Based on the composition, ask follow-up questions (noise sensitivity, commute, lifestyle rituals, pets, special needs).
      3. Use "mode": "MULTIPLE" when asking for preferences, amenities, or things that could have multiple answers.
      4. Every response MUST provide 3-4 "Quick Option Buttons".
      5. When you have enough info (approx 4-6 rounds), set isFinished: true.

      RETURN FORMAT MUST BE JSON:
      {
        "question": "Next question text",
        "options": ["Option 1", "Option 2", "Option 3"],
        "mode": "SINGLE" | "MULTIPLE",
        "isFinished": boolean
      }
    ` : `
      You are the Interview Navigator for Butler. Your goal is to understand a landlord's ideal tenant profile.
      CRITICAL: All text fields in the JSON response (question, options) MUST be in the language associated with locale: ${locale}.
      Ask about traits, stability, deal-breakers (smoking, pets, altars), etc.
      Use "mode": "MULTIPLE" for deal-breakers or tenant requirements.
      RETURN FORMAT same as above (must include "mode").
    `;

    const prompt = `
      ${systemPrompt}
      CURRENT CHAT HISTORY:
      ${history.map((m: any) => `${m.role}: ${m.content}`).join("\n")}
      
      Generate the next guided question.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { question: "Could you tell me more?", options: [], isFinished: false };

    return successResponse(data);
  });
}
