import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { genAI } from "./config";

/**
 * Every vector stored in Listing.embedding was produced by this model.
 * Changing it invalidates the whole corpus, so a full backfill has to follow
 * (scripts/backfill-embeddings.ts --all).
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Must stay in sync with the vector(768) column in prisma/schema.prisma. */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Gemini retrieval embeddings are asymmetric. A listing is an indexed document,
 * a tenant's sentence is a query, and telling the model which is which puts the
 * two in a comparable space. Embedding both sides as queries is the single most
 * common way to lose ranking quality without noticing.
 */
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/**
 * Which parts of a listing get folded into the embedded text.
 *
 * - "spec"          address, size and floor only. What the pipeline shipped
 *                   originally, kept so results stay comparable.
 * - "spec_features" adds the title, the asking price and the structured
 *                   amenity flags.
 * - "narrative"     adds the free-text description and the AI-generated
 *                   highlights, which is the richest but also the noisiest.
 *
 * scripts/eval-retrieval.ts scores all three against the same query set.
 */
export type ListingTextStrategy = "spec" | "spec_features" | "narrative";

export const LISTING_TEXT_STRATEGIES: ListingTextStrategy[] = [
  "spec",
  "spec_features",
  "narrative",
];

/**
 * The strategy the write path uses. Switching this requires re-running the
 * backfill, because mixing strategies inside one index makes distances
 * meaningless.
 */
export const DEFAULT_LISTING_TEXT_STRATEGY: ListingTextStrategy = "spec";

export interface EmbeddableListing {
  title?: string | null;
  address?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  features?: unknown;
  butlerInsight?: unknown;
}

export interface VectorSearchOptions {
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  includeExpired?: boolean;
  /** Drop hits below this cosine similarity, in [0, 1]. */
  minSimilarity?: number;
}

export interface VectorSearchHit {
  id: string;
  title: string;
  address: string;
  price: number;
  currency: string;
  images: string[];
  similarity: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

/**
 * Turns the structured amenity JSON into the kind of phrasing a tenant would
 * actually type. Keeping the document in the same register as the query is
 * worth more than any amount of index tuning.
 */
function describeFeatures(features: Record<string, any>): string[] {
  const parts: string[] = [];

  if (features.size) parts.push(`坪數 ${features.size}`);
  if (features.floor) parts.push(`樓層 ${features.floor}`);
  if (features.roomType) parts.push(`房型 ${features.roomType}`);
  if (features.elevator === true) parts.push("有電梯");
  if (features.balcony === true) parts.push("有陽台");
  if (features.pets === "allow") parts.push("可養寵物");
  if (features.cooking === "allow") parts.push("可開伙");

  if (Array.isArray(features.appliances) && features.appliances.length > 0) {
    parts.push(`家電: ${features.appliances.join("、")}`);
  }
  if (Array.isArray(features.atmosphereTags) && features.atmosphereTags.length > 0) {
    parts.push(`氛圍: ${features.atmosphereTags.join("、")}`);
  }

  return parts;
}

/**
 * Builds the text that actually gets embedded. Returns an empty string when the
 * listing carries nothing worth indexing, which the callers treat as "skip".
 */
export function buildListingText(
  listing: EmbeddableListing,
  strategy: ListingTextStrategy = DEFAULT_LISTING_TEXT_STRATEGY
): string {
  const features = asRecord(listing.features);
  const insight = asRecord(listing.butlerInsight);
  const segments: string[] = [];

  if (strategy === "spec") {
    if (!listing.address || !features.size) return "";
    return `地址: ${listing.address}。坪數: ${features.size}。樓層: ${features.floor || ""}`;
  }

  if (listing.title) segments.push(`標題: ${listing.title}`);
  if (listing.address) segments.push(`地址: ${listing.address}`);
  if (listing.price) {
    segments.push(`月租金: ${listing.price} ${listing.currency || "TWD"}`);
  }

  const featureText = describeFeatures(features);
  if (featureText.length > 0) segments.push(`條件: ${featureText.join("、")}`);

  if (strategy === "narrative") {
    if (listing.description) {
      segments.push(`描述: ${listing.description.slice(0, 1500)}`);
    }
    if (Array.isArray(insight.highlightLines) && insight.highlightLines.length > 0) {
      segments.push(`亮點: ${insight.highlightLines.slice(0, 5).join("、")}`);
    }
  }

  return segments.join("。");
}

/**
 * Embeds a single string, retrying on the throttling responses the Gemini API
 * returns under load. Mirrors the backoff already used by generateWithRetry.
 */
export async function embedText(
  text: string,
  taskType: EmbeddingTaskType,
  retries = 3,
  delay = 2000
): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Refusing to embed an empty string.");

  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  let wait = delay;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await model.embedContent({
        content: { parts: [{ text: trimmed }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);

      const values = result.embedding?.values;
      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values?.length ?? 0}.`
        );
      }
      return values;
    } catch (error: any) {
      const throttled = error?.status === 429 || error?.status === 503;
      if (!throttled || attempt === retries - 1) throw error;

      console.warn(
        `Embedding API ${error.status}. Retrying in ${wait}ms (attempt ${attempt + 1}/${retries}).`
      );
      await sleep(wait);
      wait *= 2;
    }
  }

  throw new Error("Embedding retry loop exited without a result.");
}

/** pgvector accepts vectors as a bracketed literal cast to ::vector. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Cosine similarity for in-process ranking. Gemini only returns unit-length
 * vectors at the full 3072 dimensions, so the truncated 768-dimension output
 * has to be divided by its magnitude rather than dot-producted directly.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}.`);
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Embeds a listing and writes the vector back. Returns false when the listing
 * had nothing indexable, so callers can distinguish a skip from a failure.
 */
export async function embedListing(
  listingId: string,
  listing: EmbeddableListing,
  strategy: ListingTextStrategy = DEFAULT_LISTING_TEXT_STRATEGY
): Promise<boolean> {
  const text = buildListingText(listing, strategy);
  if (!text) return false;

  const vector = await embedText(text, "RETRIEVAL_DOCUMENT");
  await db.$executeRaw`
    UPDATE "Listing"
    SET "embedding" = ${toVectorLiteral(vector)}::vector
    WHERE "id" = ${listingId}
  `;

  return true;
}

/**
 * Nearest-neighbour lookup over the stored vectors.
 *
 * The distance expression has to appear verbatim in ORDER BY for Postgres to
 * pick up the HNSW index; wrapping it in the SELECT alias alone falls back to a
 * sequential scan.
 */
export async function searchListingsByVector(
  queryVector: number[],
  options: VectorSearchOptions = {}
): Promise<VectorSearchHit[]> {
  const {
    limit = 10,
    minPrice,
    maxPrice,
    includeExpired = false,
    minSimilarity,
  } = options;

  const literal = toVectorLiteral(queryVector);
  const filters: Prisma.Sql[] = [Prisma.sql`"embedding" IS NOT NULL`];

  if (!includeExpired) filters.push(Prisma.sql`"isExpired" = false`);
  if (typeof minPrice === "number") filters.push(Prisma.sql`"price" >= ${minPrice}`);
  if (typeof maxPrice === "number") filters.push(Prisma.sql`"price" <= ${maxPrice}`);

  const rows = await db.$queryRaw<VectorSearchHit[]>`
    SELECT
      "id",
      "title",
      "address",
      "price",
      "currency",
      "images",
      1 - ("embedding" <=> ${literal}::vector) AS "similarity"
    FROM "Listing"
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY "embedding" <=> ${literal}::vector
    LIMIT ${limit}
  `;

  if (typeof minSimilarity !== "number") return rows;
  return rows.filter((row) => row.similarity >= minSimilarity);
}

/** Convenience wrapper that embeds the tenant's sentence as a query first. */
export async function searchListingsByText(
  query: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchHit[]> {
  const queryVector = await embedText(query, "RETRIEVAL_QUERY");
  return searchListingsByVector(queryVector, options);
}
