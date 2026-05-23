import { genAI, MODELS, generateWithRetry } from "@/lib/ai";
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
    question: "您的每月最高租屋預算範圍大約是多少？",
    options: ["15,000 以下", "15,000 - 25,000", "25,000 - 35,000", "35,000 以上"],
    mode: "SINGLE"
  },
  {
    step: 2,
    field: "environment",
    question: "請問您偏好哪些「大樓服務」與「理想居住氛圍」？（可多選）",
    options: ["電梯", "垃圾代收", "管理員代收件", "獨立陽台", "台水台電計費", "網路寬頻", "安靜巷弄", "採光優越", "高樓層景觀", "新屋", "通風良好", "純住宅區"],
    mode: "MULTIPLE"
  },
  {
    step: 3,
    field: "hardware",
    question: "請問您需要房東提供哪些房源「必備家具與家電設備」？（可多選）",
    options: ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "天然瓦斯", "床組", "衣櫃", "沙發", "書桌"],
    mode: "MULTIPLE"
  },
  {
    step: 4,
    field: "lifestyle",
    question: "您的「生活習慣」與「周邊生活機能」有哪些需要管家特別注意？（可多選）",
    options: ["可養寵物", "可開伙", "近便利商店", "近超市", "樓下有宵夜", "附近有公園"],
    mode: "MULTIPLE"
  },
  {
    step: 5,
    field: "transit",
    question: "最後，請告訴我們您每天出行的「交通偏好」與車位需求？（可多選）",
    options: ["近捷運 (5min內)", "近捷運 (10min內)", "好停機車", "有平面車位", "近公車站"],
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
      const prompt = `
        你是一個智慧租屋意圖解析器。房客正在回答一個關於 "${field}" 的問答。
        房客回答內容: "${message}"
        
        請將房客的偏好與預算，嚴格提取為一個標準的 JSON 物件：
        
        【提取規則】：
        1. 如果 field 是 "budget"，請精確提取出預算的最低下限與最高上限，格式為: { "minBudget": 數字, "maxBudget": 數字 }。
           - 例如「15,000 - 25,000」提取為 { "minBudget": 15000, "maxBudget": 25000 }。
           - 如果只有上限（如「15,000 以下」或「25000元以下」），請提取為 { "minBudget": 0, "maxBudget": 15000 }。
           - 如果只有下限（如「35,000 以上」），請提取為 { "minBudget": 35000, "maxBudget": 999999 }。
        2. 如果 field 是 "region" 或 "lifestyle" 或 "hardware" 或 "transit" 或 "environment"，請將他提及的生活習慣、設備或偏好，從以下【35個標準標籤清單】中進行語意配對。
           【35個標準標籤清單】：
           - 安靜巷弄, 採光優越, 高樓層景觀, 新屋, 通風良好, 純住宅區
           - 冷氣, 冰箱, 洗衣機, 電視, 熱水器, 天然瓦斯, 床組, 衣櫃, 沙發, 書桌
           - 垃圾代收, 管理員代收件, 電梯, 獨立陽台, 台水台電計費, 網路寬頻
           - 可養寵物, 可開伙, 近便利商店, 近超市, 樓下有宵夜, 附近有公園
           - 近捷運 (5min內), 近捷運 (10min內), 近公車站, 好停機車, 有平面車位
           
           提取格式必須是字串陣列，例如: { "tags": ["可養寵物", "安靜巷弄"] }。
           如果他提及電梯，請同時在 JSON 中輸出: "elevator": true。
           如果他提及寵物，請同時在 JSON 中輸出: "pets": true。

        請直接回傳 JSON 格式字串，例如: { "minBudget": 15000, "maxBudget": 25000 } 或 { "tags": ["可養寵物", "冷氣"] }。
      `;

      const result = await generateWithRetry(model, prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const existingTags = (user?.aiTags as any) || {};
        
        // Merge newly extracted tags into tagsWithWeight (setting default weight to 2 / "重要")
        let updatedTagsWithWeight = { ...(existingTags.tagsWithWeight || {}) };
        let updatedTagsArray = [...(existingTags.tags || [])];
        
        // ⚡ Defensive Programming: Gather tags from "tags" array AND any dynamic categories Gemini outputs (like hardware, transit, etc.)!
        const allExtractedTags: string[] = [];
        if (parsed.tags && Array.isArray(parsed.tags)) {
          allExtractedTags.push(...parsed.tags);
        }
        
        const CATEGORY_KEYS = ["transit", "hardware", "lifestyle", "environment", "regions", "lifestyleTags"];
        CATEGORY_KEYS.forEach(key => {
          if (parsed[key] && Array.isArray(parsed[key])) {
            allExtractedTags.push(...parsed[key]);
          }
        });

        // Normalize and map all extracted tags into tagsWithWeight perfectly!
        allExtractedTags.forEach((tag: string) => {
          const cleanTag = tag.trim();
          updatedTagsWithWeight[cleanTag] = 2; // Default weight: Important
          if (!updatedTagsArray.includes(cleanTag)) {
            updatedTagsArray.push(cleanTag);
          }
        });

        // Hard constraints sync helpers
        const hasElevator = allExtractedTags.includes("電梯") || parsed.elevator === true;
        const hasPets = allExtractedTags.includes("可養寵物") || parsed.pets === true;

        const finalTags = {
          ...existingTags,
          ...parsed,
          elevator: hasElevator ? true : existingTags.elevator || false,
          pets: hasPets ? true : existingTags.pets || false,
          tagsWithWeight: updatedTagsWithWeight,
        };
        
        // Force clean up extra properties to match schema perfectly
        CATEGORY_KEYS.forEach(key => delete finalTags[key]);
        delete finalTags.tags;
        
        finalTags.tags = Object.keys(updatedTagsWithWeight);

        await prisma.user.upsert({
          where: { id: userId },
          update: { aiTags: finalTags },
          create: {
            id: userId,
            role: "TENANT",
            aiTags: finalTags
          }
        });
        
        console.log(`[AI Onboarding Sync] Successfully parsed and synced user ${userId} preferences:`, finalTags);
      }
    } catch (e) {
      console.error("Failed to parse intent with AI:", e);
    }
  }
}
