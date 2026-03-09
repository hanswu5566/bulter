import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateInspectionGuideWithAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { listingId } = await req.json();
    if (!listingId) return errorResponse("Missing listingId", 400);

    const listing = await db.listing.findUnique({
      where: { id: listingId }
    });
    
    if (!listing) return errorResponse("Listing not found", 404);

    const result = await generateInspectionGuideWithAI(listing);
    return successResponse(result);
  });
}
