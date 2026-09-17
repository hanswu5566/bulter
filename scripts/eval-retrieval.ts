/**
 * Retrieval evaluation for the listing vector index.
 *
 * Answers the only question that matters before shipping semantic search: when
 * a tenant describes what they want, does the right listing come back, and does
 * the choice of embedded text actually change that?
 *
 * Every strategy is scored in-process over the same corpus and the same query
 * set, so the numbers are comparable without touching the production index.
 * `--live` then runs the same queries through the real pgvector path to confirm
 * the database agrees with the offline ranking.
 *
 *   npx tsx scripts/eval/generate-golden-set.ts --size=40
 *   npx tsx scripts/eval-retrieval.ts
 *   npx tsx scripts/eval-retrieval.ts --corpus-limit=500 --live
 *
 * Embeddings are cached on disk, so re-running after a prompt or strategy tweak
 * only pays for what actually changed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/lib/db";
import {
  DEFAULT_LISTING_TEXT_STRATEGY,
  EMBEDDING_MODEL,
  LISTING_TEXT_STRATEGIES,
  ListingTextStrategy,
  buildListingText,
  cosineSimilarity,
  embedText,
  searchListingsByText,
} from "../src/lib/ai/embeddings";

loadLocalEnv();

const GOLDEN_SET_PATH = resolve(process.cwd(), "scripts/eval/golden-set.json");
const CACHE_PATH = resolve(process.cwd(), "scripts/eval/.embedding-cache.json");
const RECALL_CUTOFFS = [1, 3, 5, 10];
const MRR_CUTOFF = 10;
const DELAY_BETWEEN_CALLS_MS = 120;

function loadLocalEnv() {
  try {
    (process as any).loadEnvFile?.(".env");
  } catch {
    // Already exported into the shell.
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

interface GoldenCase {
  query: string;
  relevantListingIds: string[];
  sourceTitle?: string;
}

interface Metrics {
  cases: number;
  recall: Record<number, number>;
  mrr: number;
}

// ---------------------------------------------------------------------------
// Embedding cache
// ---------------------------------------------------------------------------

type Cache = Record<string, number[]>;

function loadCache(): Cache {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Cache;
  } catch {
    console.warn("Embedding cache is unreadable, starting from empty.");
    return {};
  }
}

function saveCache(cache: Cache) {
  mkdirSync(resolve(process.cwd(), "scripts/eval"), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

const cache = loadCache();
let apiCalls = 0;

async function embedCached(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[]> {
  const key = createHash("sha256")
    .update(`${EMBEDDING_MODEL}|${taskType}|${text}`)
    .digest("hex");

  const hit = cache[key];
  if (hit) return hit;

  const vector = await embedText(text, taskType);
  cache[key] = vector;
  apiCalls++;
  await sleep(DELAY_BETWEEN_CALLS_MS);
  return vector;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Recall@k and MRR over a ranking of listing ids. Relevance is binary: the
 * golden set names the listings that should come back and nothing else counts.
 */
function score(rankings: Array<{ ranked: string[]; relevant: Set<string> }>): Metrics {
  const recall: Record<number, number> = {};
  for (const k of RECALL_CUTOFFS) recall[k] = 0;
  let reciprocalRankSum = 0;

  for (const { ranked, relevant } of rankings) {
    for (const k of RECALL_CUTOFFS) {
      const found = ranked.slice(0, k).filter((id) => relevant.has(id)).length;
      recall[k] += found / relevant.size;
    }

    const firstHit = ranked.slice(0, MRR_CUTOFF).findIndex((id) => relevant.has(id));
    if (firstHit >= 0) reciprocalRankSum += 1 / (firstHit + 1);
  }

  const n = rankings.length || 1;
  for (const k of RECALL_CUTOFFS) recall[k] /= n;

  return { cases: rankings.length, recall, mrr: reciprocalRankSum / n };
}

function formatMetrics(label: string, metrics: Metrics): string {
  const recall = RECALL_CUTOFFS.map(
    (k) => `${(metrics.recall[k] * 100).toFixed(1).padStart(5)}%`
  ).join("  ");
  return `${label.padEnd(16)}  ${recall}  ${metrics.mrr.toFixed(3).padStart(6)}`;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

async function evaluateStrategy(
  strategy: ListingTextStrategy,
  corpus: Array<{ id: string; text: string }>,
  queryVectors: Map<string, number[]>,
  cases: GoldenCase[]
): Promise<Metrics> {
  const docVectors = new Map<string, number[]>();

  for (const doc of corpus) {
    docVectors.set(doc.id, await embedCached(doc.text, "RETRIEVAL_DOCUMENT"));
  }

  const rankings = cases.map((testCase) => {
    const queryVector = queryVectors.get(testCase.query)!;

    const ranked = corpus
      .map((doc) => ({
        id: doc.id,
        similarity: cosineSimilarity(queryVector, docVectors.get(doc.id)!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map((entry) => entry.id);

    return { ranked, relevant: new Set(testCase.relevantListingIds) };
  });

  return score(rankings);
}

async function evaluateLive(cases: GoldenCase[]): Promise<Metrics> {
  const rankings: Array<{ ranked: string[]; relevant: Set<string> }> = [];

  for (const testCase of cases) {
    const hits = await searchListingsByText(testCase.query, { limit: MRR_CUTOFF });
    rankings.push({
      ranked: hits.map((hit) => hit.id),
      relevant: new Set(testCase.relevantListingIds),
    });
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  return score(rankings);
}

async function main() {
  if (!existsSync(GOLDEN_SET_PATH)) {
    throw new Error(
      `No golden set at ${GOLDEN_SET_PATH}. Run: npx tsx scripts/eval/generate-golden-set.ts`
    );
  }

  const goldenSet = JSON.parse(readFileSync(GOLDEN_SET_PATH, "utf8")) as { cases: GoldenCase[] };
  const cases = (goldenSet.cases || []).filter((c) => c.query && c.relevantListingIds?.length);

  if (cases.length === 0) throw new Error("The golden set contains no usable cases.");

  const corpusLimit = Number(flag("corpus-limit")) || 300;
  const strategies = (flag("strategies")?.split(",") as ListingTextStrategy[]) ||
    LISTING_TEXT_STRATEGIES;

  // A listing that is not in the corpus can never be retrieved, which would
  // silently cap recall. Relevant listings are pulled in regardless of the cap.
  const relevantIds = [...new Set(cases.flatMap((c) => c.relevantListingIds))];
  const [recent, required] = await Promise.all([
    db.listing.findMany({
      where: { isExpired: false },
      orderBy: { createdAt: "desc" },
      take: corpusLimit,
    }),
    db.listing.findMany({ where: { id: { in: relevantIds } } }),
  ]);

  const missing = relevantIds.filter((id) => !required.some((l) => l.id === id));
  if (missing.length > 0) {
    console.warn(`${missing.length} relevant listing(s) no longer exist and will always miss.`);
  }

  const merged = new Map([...recent, ...required].map((l) => [l.id, l]));
  const listings = [...merged.values()];

  console.log(`Corpus: ${listings.length} listing(s) | Queries: ${cases.length}`);
  console.log(`Model: ${EMBEDDING_MODEL}\n`);

  const queryVectors = new Map<string, number[]>();
  for (const testCase of cases) {
    queryVectors.set(testCase.query, await embedCached(testCase.query, "RETRIEVAL_QUERY"));
  }

  const results: Array<[string, Metrics]> = [];

  for (const strategy of strategies) {
    const corpus = listings
      .map((listing) => ({ id: listing.id, text: buildListingText(listing, strategy) }))
      .filter((doc) => doc.text.length > 0);

    if (corpus.length === 0) {
      console.warn(`Strategy "${strategy}" produced no indexable documents, skipped.`);
      continue;
    }

    process.stdout.write(`Evaluating "${strategy}" over ${corpus.length} document(s)... `);
    const metrics = await evaluateStrategy(strategy, corpus, queryVectors, cases);
    console.log("done.");

    const label = strategy === DEFAULT_LISTING_TEXT_STRATEGY ? `${strategy} *` : strategy;
    results.push([label, metrics]);
    saveCache(cache);
  }

  if (hasFlag("live")) {
    process.stdout.write("Evaluating the live pgvector index... ");
    results.push(["pgvector (live)", await evaluateLive(cases)]);
    console.log("done.");
  }

  const header = RECALL_CUTOFFS.map((k) => `  R@${k}`.padStart(7)).join("  ");
  console.log(`\n${"strategy".padEnd(16)}  ${header}     MRR`);
  console.log("-".repeat(18 + RECALL_CUTOFFS.length * 9 + 8));
  for (const [label, metrics] of results) console.log(formatMetrics(label, metrics));

  console.log(`\n* current write-path strategy. ${apiCalls} embedding call(s) this run.`);
  saveCache(cache);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
