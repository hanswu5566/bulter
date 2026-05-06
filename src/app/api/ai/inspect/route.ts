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

    const butlerInsight = (listing.butlerInsight as any) || {};
    if (butlerInsight.inspectionGuide) {
      console.log("Serving inspection guide from DB cache.");
      return successResponse(butlerInsight.inspectionGuide);
    }

    console.log("Inspection guide not cached. Generating live...");
    const result = await generateInspectionGuideWithAI(listing);
    
    if (result && result.points) {
      try {
        await db.listing.update({
          where: { id: listingId },
          data: {
            butlerInsight: {
              ...butlerInsight,
              inspectionGuide: result
            }
          }
        });
        console.log("Successfully saved generated inspection guide to DB cache.");
      } catch (dbErr) {
        console.error("Failed to save generated inspection guide to DB:", dbErr);
      }
    }

    return successResponse(result);
  });
}
