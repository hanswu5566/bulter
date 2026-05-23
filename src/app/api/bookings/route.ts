import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const bookings = await db.booking.findMany({
      where: {
        OR: [
          { tenantId: session.user.id },
          { landlordId: session.user.id }
        ]
      },
      include: {
        listing: true,
        tenant: true,
      },
      orderBy: { scheduledAt: 'desc' }
    });

    return successResponse(bookings);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { listingId, scheduledAt, landlordId } = await req.json();

    const newBooking = await db.booking.create({
      data: {
        tenantId: session.user.id,
        landlordId,
        listingId,
        scheduledAt: new Date(scheduledAt),
        status: "REQUESTED",
      },
    });

    return successResponse(newBooking);
  });
}
