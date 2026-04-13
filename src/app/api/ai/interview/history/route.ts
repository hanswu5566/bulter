import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) return errorResponse("Missing sessionId", 400);

    const session = await auth();
    const userId = session?.user?.id;

    // We allow fetching by sessionId. If userId is present, we could check if it matches, 
    // but Butler sessions can be anonymous initially.
    const conversation = await prisma.aiConversation.findUnique({
      where: { sessionId },
      include: { 
        messages: { 
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            content: true,
            createdAt: true,
          }
        } 
      },
    });

    if (!conversation) {
      return successResponse({ messages: [] });
    }

    return successResponse({
      messages: conversation.messages,
      role: conversation.role,
      isFinished: !conversation.isActive
    });
  });
}
