/**
 * Regenerates Listing.embedding.
 *
 * Needed whenever the embedding model, the output dimension or the text
 * strategy changes, and to populate rows that were ingested while the embedding
 * step was failing. Mixing vectors produced by different strategies inside one
 * index makes cosine distances meaningless, so a strategy switch always means a
 * full `--all` pass.
 *
 *   npx tsx scripts/backfill-embeddings.ts
 *   npx tsx scripts/backfill-embeddings.ts --all --strategy=narrative
 *   npx tsx scripts/backfill-embeddings.ts --limit=50 --dry-run
 */
import { db } from "../src/lib/db";
import {
  DEFAULT_LISTING_TEXT_STRATEGY,
  LISTING_TEXT_STRATEGIES,
  ListingTextStrategy,
  buildListingText,
  embedListing,
} from "../src/lib/ai/embeddings";

loadLocalEnv();

const DELAY_BETWEEN_CALLS_MS = 250;

function loadLocalEnv() {
  try {
    (process as any).loadEnvFile?.(".env");
  } catch {
    // Already exported into the shell, or running under a loader that does it.
  }
}

function flag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.split("=").slice(1).join("=") : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const all = hasFlag("all");
  const dryRun = hasFlag("dry-run");
  const limit = Number(flag("limit")) || undefined;
  const strategy = (flag("strategy") || DEFAULT_LISTING_TEXT_STRATEGY) as ListingTextStrategy;

  if (!LISTING_TEXT_STRATEGIES.includes(strategy)) {
    throw new Error(
      `Unknown strategy "${strategy}". Expected one of: ${LISTING_TEXT_STRATEGIES.join(", ")}.`
    );
  }

  // Prisma cannot select an Unsupported() column, so the set of rows still
  // missing a vector has to come from raw SQL.
  const targets = all
    ? await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Listing" ORDER BY "createdAt" DESC`
    : await db.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Listing" WHERE "embedding" IS NULL ORDER BY "createdAt" DESC
      `;

  const ids = limit ? targets.slice(0, limit).map((r) => r.id) : targets.map((r) => r.id);

  console.log(
    `Strategy "${strategy}" | ${ids.length} listing(s) to process${dryRun ? " | dry run" : ""}.`
  );
  if (ids.length === 0) return;

  const listings = await db.listing.findMany({ where: { id: { in: ids } } });
  const byId = new Map(listings.map((l) => [l.id, l]));

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, id] of ids.entries()) {
    const listing = byId.get(id);
    if (!listing) {
      skipped++;
      continue;
    }

    const preview = buildListingText(listing, strategy);
    if (!preview) {
      console.warn(`[${index + 1}/${ids.length}] ${id} skipped: no indexable text.`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[${index + 1}/${ids.length}] ${id}\n    ${preview.slice(0, 160)}`);
      embedded++;
      continue;
    }

    try {
      await embedListing(id, listing, strategy);
      embedded++;
      console.log(`[${index + 1}/${ids.length}] ${id} embedded.`);
    } catch (error: any) {
      failed++;
      console.error(`[${index + 1}/${ids.length}] ${id} failed: ${error?.message || error}`);
    }

    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  console.log(`\nEmbedded ${embedded}, skipped ${skipped}, failed ${failed}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
