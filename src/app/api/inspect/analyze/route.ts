import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeInspectionPhoto } from "@/lib/ai";
import { withErrorHandler, withRateLimit, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return errorResponse("Unauthorized", 401);

  // Strict rate limit for heavy multi-modal vision analysis: 5 calls per 60 seconds per user
  return withRateLimit(req, "INSPECT_ANALYZE", 5, 60, async () => {
    return withErrorHandler(async () => {
      const { image, taskName } = await req.json();
      
      // Basic payload size check (approx 5MB limit for safety)
      if (image && image.length > 5 * 1024 * 1024 * 1.37) { // base64 overhead multiplier
        return errorResponse("Payload too large. Image must be under 5MB.", 413);
      }

      const analysis = await analyzeInspectionPhoto(image, taskName);
      return successResponse({ analysis });
    });
  });
}
