import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const chatSessions = await db.chatSession.findMany({
      where: {
        users: {
          some: { id: session.user.id }
        }
      },
      include: {
        listing: {
          select: { id: true, title: true, images: true, address: true }
        },
        users: {
          select: { id: true, name: true, image: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(chatSessions);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { listingId, otherUserId } = await req.json();

    // Find if a session already exists between these two for this listing
    const existingSession = await db.chatSession.findFirst({
      where: {
        listingId,
        AND: [
          { users: { some: { id: session.user.id } } },
          { users: { some: { id: otherUserId } } }
        ]
      },
      include: {
        users: { select: { id: true, name: true, image: true } }
      }
    });

    if (existingSession) return successResponse(existingSession);

    const newSession = await db.chatSession.create({
      data: {
        listingId,
        users: {
          connect: [
            { id: session.user.id },
            { id: otherUserId }
          ]
        }
      },
      include: {
        users: { select: { id: true, name: true, image: true } }
      }
    });

    return successResponse(newSession);
  });
}
