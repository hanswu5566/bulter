import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { diagnoseMatchWithAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { listingId } = await req.json();
    if (!listingId) return errorResponse("Missing listingId", 400);

    // 1. Get User Data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { profileTags: true }
    });
    
    const userTags = (user?.profileTags as string[]) || [];
    if (userTags.length === 0) {
      return errorResponse("您尚未設定個人偏好標籤，請先至個人設定頁面填寫。", 400);
    }

    // 2. Get Listing Data
    const listing = await db.listing.findUnique({
      where: { id: listingId }
    });
    
    if (!listing) return errorResponse("Listing not found", 404);

    // 3. Run AI Diagnosis
    const result = await diagnoseMatchWithAI(userTags, listing);

    return successResponse(result);
  });
}
