import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scrapeListing } from "@/lib/scrapers";
import { parseListingWithAI, parseListingFromImage } from "@/lib/ai";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "LANDLORD") {
      return errorResponse("Unauthorized", 401);
    }

    const { url, text } = await req.json();
    
    let contentToParse = "";
    let source = "GENERIC";

    if (url) {
      const result = await scrapeListing(url);
      contentToParse = result.rawContent;
      source = result.source;
    } else if (text) {
      contentToParse = text;
    } else {
      return errorResponse("Invalid input: Please provide a listing URL or text.", 400);
    }

    const structuredData = await parseListingWithAI(contentToParse, source);
    
    return successResponse(structuredData);
  });
}
