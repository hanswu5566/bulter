/**
 * Builds a labelled query set for retrieval evaluation.
 *
 * There is no click log to mine, so each case is generated from a listing the
 * model can see and graded against that same listing. The prompt deliberately
 * withholds the address and forces paraphrase, otherwise the model writes a
 * near-copy of the document and every strategy scores a perfect 1.0.
 *
 * The output is a plain JSON file. Editing it by hand, deleting weak cases or
 * adding real user queries is expected and makes the benchmark stronger.
 *
 *   npx tsx scripts/eval/generate-golden-set.ts --size=40
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { db } from "../../src/lib/db";
import { MODELS, genAI, generateWithRetry, parseAIJson } from "../../src/lib/ai/config";
import { buildListingText } from "../../src/lib/ai/embeddings";

loadLocalEnv();

const OUTPUT_PATH = resolve(process.cwd(), "scripts/eval/golden-set.json");
const DELAY_BETWEEN_CALLS_MS = 400;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface GoldenCase {
  query: string;
  relevantListingIds: string[];
  sourceTitle: string;
}

const PROMPT = `你是一位正在找房的台灣租客。以下是一則房源的完整資料。

請寫出「一句」你可能會在搜尋框輸入的自然中文句子，條件是：
- 只根據這則房源真實具備的條件來寫，不要憑空加上資料裡沒有的條件。
- 不要直接寫出完整地址或社區名稱，最多只提到行政區或捷運站。
- 用口語的方式描述需求，不要照抄原文用詞。
- 句子長度 15 到 40 個字。

房源資料：
---
{{LISTING}}
---

只回傳 JSON，格式為 {"query": "..."}`;

async function main() {
  const size = Number(flag("size")) || 40;

  const listings = await db.listing.findMany({
    where: { isExpired: false },
    orderBy: { createdAt: "desc" },
    take: size * 2,
  });

  const usable = listings.filter((l) => buildListingText(l, "narrative").length > 40);
  const sample = usable.slice(0, size);

  if (sample.length === 0) {
    throw new Error("No listings with enough text to generate queries from.");
  }
  console.log(`Generating ${sample.length} case(s) from ${usable.length} usable listing(s).`);

  const model = genAI.getGenerativeModel({ model: MODELS.STANDARD });
  const cases: GoldenCase[] = [];

  for (const [index, listing] of sample.entries()) {
    const prompt = PROMPT.replace("{{LISTING}}", buildListingText(listing, "narrative"));

    try {
      const result = await generateWithRetry(model, prompt);
      const parsed = parseAIJson<{ query: string }>(result?.response?.text() ?? "");

      if (!parsed?.query) {
        console.warn(`[${index + 1}/${sample.length}] ${listing.id}: unparseable response, skipped.`);
        continue;
      }

      cases.push({
        query: parsed.query.trim(),
        relevantListingIds: [listing.id],
        sourceTitle: listing.title,
      });
      console.log(`[${index + 1}/${sample.length}] ${parsed.query.trim()}`);
    } catch (error: any) {
      console.warn(`[${index + 1}/${sample.length}] ${listing.id} failed: ${error?.message || error}`);
    }

    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), generatorModel: MODELS.STANDARD, cases },
      null,
      2
    ) + "\n"
  );

  console.log(`\nWrote ${cases.length} case(s) to ${OUTPUT_PATH}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
