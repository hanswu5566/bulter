import { db } from "./lib/db";

async function run() {
  try {
    await db.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("Successfully enabled pgvector extension.");
  } catch (e) {
    console.error("Failed to enable pgvector:", e);
  }
}

run();
