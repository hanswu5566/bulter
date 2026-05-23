import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { bookingId, checklistData, photos } = await req.json();

    // 1. 取得預約與房源資訊
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true }
    });

    if (!booking) return errorResponse("Booking not found", 404);

    // 2. 建立實勘報告
    const report = await db.inspectionReport.create({
      data: {
        bookingId,
        listingId: booking.listingId,
        tenantId: session.user.id,
        checklistData,
        photos,
        status: "COMPLETED",
      },
    });

    // 3. 更新預約狀態
    await db.booking.update({
      where: { id: bookingId },
      data: { status: "VISITED" },
    });

    // 4. [Trust Loop] 自動回流修正房源資料 (根據 Checklist 事實)
    // 這裡實作簡易邏輯：若房客回報漏水且存證，自動標記房源
    if (checklistData.has_leakage === "warning") {
        await db.listing.update({
            where: { id: booking.listingId },
            data: {
                marketTags: {
                    ...(booking.listing.marketTags as object || {}),
                    verified_leakage_alert: true
                }
            }
        });
    }

    return successResponse(report);
  });
}
