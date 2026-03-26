import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { genAI, MODELS } from "@/lib/ai";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const { id: sessionId } = await params;
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const messages = await db.chatMessage.findMany({
      where: { sessionId },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return successResponse(messages);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const { id: sessionId } = await params;
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { content } = await req.json();

    // Find the session and the recipient
    const chatSession = await db.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        users: true
      }
    });

    if (!chatSession) return errorResponse("Session not found", 404);

    const recipient = chatSession.users.find(u => u.id !== session.user.id);
    const sender = chatSession.users.find(u => u.id === session.user.id);

    // AI Translation if needed
    let translatedContent: Record<string, string> | null = null;
    const senderLang = (sender?.baseProfile as any)?.language || "zh-TW";
    const recipientLang = (recipient?.baseProfile as any)?.language || "zh-TW";

    if (recipient && senderLang !== recipientLang) {
      try {
        const model = genAI.getGenerativeModel({ model: MODELS.LITE });
        const prompt = `Translate the following message from a rental platform user. 
          The target language is: ${recipientLang}.
          Return ONLY the translated text.
          Message: ${content}`;
        const result = await model.generateContent(prompt);
        translatedContent = { [recipientLang]: result.response.text() };
      } catch (err) {
        console.error("Translation failed", err);
      }
    }

    const newMessage = await db.chatMessage.create({
      data: {
        sessionId,
        senderId: session.user.id,
        content,
        translatedContent,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } }
      }
    });

    return successResponse(newMessage);
  });
}
