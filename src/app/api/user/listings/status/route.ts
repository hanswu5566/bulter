import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const statuses = await db.userListingStatus.findMany({
      where: { userId: session.user.id },
      select: { listingId: true, isRemoved: true, isSaved: true }
    });

    return successResponse(statuses);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const { listingId, isRemoved, isSaved } = await req.json();
    if (!listingId) {
      return errorResponse("Missing listingId", 400);
    }

    const status = await db.userListingStatus.upsert({
      where: {
        userId_listingId: {
          userId: session.user.id,
          listingId: listingId
        }
      },
      update: {
        ...(isRemoved !== undefined && { isRemoved }),
        ...(isSaved !== undefined && { isSaved })
      },
      create: {
        userId: session.user.id,
        listingId: listingId,
        isRemoved: isRemoved || false,
        isSaved: isSaved || false
      }
    });

    return successResponse(status);
  });
}
