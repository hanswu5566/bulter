import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { genAI, MODELS } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { content, history = [], locale = "zh-TW" } = await req.json();

    // Use Lite model for cost-efficient small talk
    const model = genAI.getGenerativeModel({ model: MODELS.LITE });
    
    const prompt = `
      You are Butler, a friendly AI rental assistant. 
      You are currently in "Small Talk" mode. Be concise and helpful.
      CRITICAL: You MUST respond in the language associated with locale: ${locale}.
      If the user asks for complex diagnosis or optimization, remind them to use the specialized buttons in the menu.
      
      Chat History:
      ${history.map((m: any) => `${m.role}: ${m.content}`).join("\n")}
      user: ${content}
      assistant:
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return successResponse({ role: "assistant", content: responseText });
  });
}
