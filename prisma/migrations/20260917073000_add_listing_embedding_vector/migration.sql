-- pgvector backs semantic retrieval over listings. The extension was enabled by
-- hand on the original database and never captured here, so a fresh clone had
-- no way to reach parity.
CREATE EXTENSION IF NOT EXISTS vector;

-- Listing.embedding already exists in schema.prisma as Unsupported("vector(768)")
-- but no migration ever created it. 768 is the truncated Gemini output width and
-- must match EMBEDDING_DIMENSIONS in src/lib/ai/embeddings.ts.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- HNSW over cosine distance, matching the <=> operator used by the search path.
-- At a few thousand rows the build is cheap and recall stays close to an
-- exhaustive scan; an ivfflat index would need retuning every time the corpus
-- grows, which this one does not.
CREATE INDEX IF NOT EXISTS "Listing_embedding_cosine_idx"
  ON "Listing" USING hnsw ("embedding" vector_cosine_ops);
