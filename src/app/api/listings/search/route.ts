import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateMatchScore } from "@/lib/matching";
import { getSignedDownloadUrl } from "@/lib/storage";
import { searchListingsByText } from "@/lib/ai/embeddings";
import {
  withErrorHandler,
  withRateLimit,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const MAX_QUERY_LENGTH = 500;

/**
 * Semantic search over the listing corpus.
 *
 * Retrieval is the vector step: the tenant's sentence is embedded as a query
 * and matched against the stored listing vectors by cosine distance. Ranking
 * then runs the existing deterministic match score over the candidates, so a
 * semantically close listing that breaks a hard constraint still surfaces as
 * a low-scoring result rather than disappearing.
 */
export async function POST(req: Request) {
  return withErrorHandler(async () =>
    withRateLimit(req, "LISTING_SEARCH", 30, 3600, async (session) => {
      if (!session?.user?.id) {
        return errorResponse("Unauthorized. Please login first.", 401);
      }

      const body = await req.json().catch(() => ({}));
      const query = typeof body.query === "string" ? body.query.trim() : "";

      if (!query) {
        return errorResponse("A non-empty 'query' string is required.", 400);
      }
      if (query.length > MAX_QUERY_LENGTH) {
        return errorResponse(
          `Query must be at most ${MAX_QUERY_LENGTH} characters.`,
          400
        );
      }

      const limit = Math.min(
        Math.max(Number(body.limit) || DEFAULT_LIMIT, 1),
        MAX_LIMIT
      );

      const hits = await searchListingsByText(query, {
        limit,
        minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
        maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      });

      if (hits.length === 0) {
        return successResponse({ query, results: [] });
      }

      // The vector query only returns the columns needed for ranking, so the
      // rows are re-read here to pick up the AI insight the match score reads.
      const listings = await db.listing.findMany({
        where: { id: { in: hits.map((hit) => hit.id) } },
      });
      const listingsById = new Map(listings.map((l) => [l.id, l]));

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { aiTags: true },
      });

      const results = await Promise.all(
        hits.map(async (hit) => {
          const listing = listingsById.get(hit.id);
          if (!listing) return null;

          const matchScore = user?.aiTags
            ? calculateMatchScore(user.aiTags, listing).score
            : null;

          const signedImages = listing.images
            ? await Promise.all(listing.images.map((img) => getSignedDownloadUrl(img)))
            : [];

          return {
            ...listing,
            images: signedImages,
            similarity: hit.similarity,
            matchScore,
          };
        })
      );

      return successResponse({
        query,
        results: results.filter((r) => r !== null),
      });
    })
  );
}
