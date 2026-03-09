import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { optimizeListingWithAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "LANDLORD") {
      return errorResponse("Unauthorized: Landlord role required", 401);
    }

    const listing = await req.json();
    if (!listing) return errorResponse("Missing listing data", 400);

    // Run AI Optimization Diagnosis
    const result = await optimizeListingWithAI(listing);

    return successResponse(result);
  });
}
