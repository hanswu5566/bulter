import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scrapeListing } from "@/lib/scrapers";
import { parseListingWithAI } from "@/lib/ai";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "LANDLORD") {
      return errorResponse("Unauthorized", 401);
    }

    const { url, text } = await req.json();
    
    if (url) {
      const result = await scrapeListing(url);
      const structuredData = await parseListingWithAI(result.rawContent, result.source);

      if (!structuredData) {
        return errorResponse("AI failed to parse listing data", 500);
      }

      // If scraper found images or coordinates, ensure they are in the result
      if (result.images && result.images.length > 0) {
        structuredData.images = result.images;
      }
      if (result.lat && result.lng) {
        structuredData.lat = result.lat;
        structuredData.lng = result.lng;
      }

      return successResponse(structuredData);
    }
 else if (text) {
      const structuredData = await parseListingWithAI(text, "GENERIC");
      return successResponse(structuredData);
    } else {
      return errorResponse("Invalid input: Please provide a listing URL or text.", 400);
    }
  });
}
