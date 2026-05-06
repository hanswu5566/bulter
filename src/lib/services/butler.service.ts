import { genAI, MODELS, BUTLER_TOOLS } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { incrementDailyUsage } from "../rate-limit";

export interface ButlerChatRequest {
  sessionId: string;
  message?: string;
  role: "TENANT" | "LANDLORD";
  locale: string;
  userId?: string;
}

export const INTERVIEW_STEPS = [
  {
    step: 1,
    field: "budget",
    question: "您的租屋預算範圍大約是多少？",
    options: ["10,000 以下", "10,000 - 20,000", "20,000 - 35,000", "35,000 以上"],
    mode: "SINGLE"
  },
  {
    step: 2,
    field: "region",
    question: "您偏好哪些區域或靠近哪個捷運站？",
    options: ["信義區", "大安區", "中正區", "近捷運站", "近公司"],
    mode: "MULTIPLE"
  },
  {
    step: 3,
    field: "lifestyle",
    question: "最後，您的生活習慣有哪些需要注意的？（可多選）",
    options: ["有養寵物", "需要開伙", "需要車位", "極度安靜", "採光要好"],
    mode: "MULTIPLE"
  }
];

export class ButlerService {
  /**
   * Main entry point for Guided Interview.
   */
  static async chat({ sessionId, message, role, locale, userId }: ButlerChatRequest) {
    let conversation = await prisma.aiConversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: { sessionId, userId, role: role as any, currentStep: 0 },
      });
    }

    const currentStepIndex = conversation.currentStep;
    const isStarting = !message || currentStepIndex === 0;

    // 1. Process previous answer if exists
    if (message && currentStepIndex > 0) {
      const stepConfig = INTERVIEW_STEPS[currentStepIndex - 1];
      // Run AI parsing in background or await if we need the tags immediately
      this.parseAndSaveIntent(userId, message, stepConfig.field, locale);
      
      // Save User Message to history
      await prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: "user", content: message },
      });
    }

    // 2. Determine Next Step
    const nextStepIndex = isStarting ? 1 : currentStepIndex + 1;
    const isFinished = nextStepIndex > INTERVIEW_STEPS.length;

    // 3. Update Conversation State
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { currentStep: nextStepIndex, isActive: !isFinished },
    });

    // 4. Return Hardcoded Question
    if (isFinished) {
      const finishMsg = "太棒了！我已經記錄下您的所有偏好，正在為您篩選最適合的房源...";
      await prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: "assistant", content: finishMsg },
      });
      return { question: finishMsg, options: [], isFinished: true };
    }

    const nextStep = INTERVIEW_STEPS[nextStepIndex - 1];
    await prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: nextStep.question },
    });

    return {
      question: nextStep.question,
      options: nextStep.options,
      mode: nextStep.mode,
      isFinished: false,
      step: nextStep.step
    };
  }

  /**
   * Use Gemini LITE to parse the user's answer into structured tags.
   */
  private static async parseAndSaveIntent(userId: string | undefined, message: string, field: string, locale: string) {
    if (!userId) return;

    try {
      const model = genAI.getGenerativeModel({ model: MODELS.LITE });
      const prompt = `User is answering a rental interview question about "${field}". 
      User Answer: "${message}"
      
      You must extract this preference into a single key-value pair for a JSON object conforming strictly to these rules:
      - If the field is "budget": extract as "budgetMax" (number, e.g. 25000) or "budgetMin" (number)
      - If the field is "region": extract as "regions" (array of strings, e.g. ["信義區"])
      - If the field is "lifestyle": extract as "lifestyleTags" (array of strings, e.g. ["有養寵物", "極度安靜"])
      
      Return ONLY JSON. Example: { "budgetMax": 20000 } or { "regions": ["信義區"] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const newTags = JSON.parse(jsonMatch[0]);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const existingTags = (user?.aiTags as any) || {};
        
        await prisma.user.update({
          where: { id: userId },
          data: { aiTags: { ...existingTags, ...newTags } },
        });
      }
    } catch (e) {
      console.error("Failed to parse intent with AI:", e);
    }
  }
}
