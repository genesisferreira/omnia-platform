import { DeterministicEmbeddingProvider } from '../adapters/embedding/deterministic-provider';
import { InMemoryVectorStore } from '../adapters/vector/in-memory-store';
import { Retriever } from '../retriever/retriever';

async function main() {
  const dims = 384;
  const provider = new DeterministicEmbeddingProvider({ dimensions: dims });
  const store = new InMemoryVectorStore();
  const n = 5000;

  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const text = `documento refrigeração industrial chunk ${i} compressor evaporador condensador`;
    const embedding = await provider.generate(text);
    await store.insert({
      id: `v-${i}`,
      chunkId: `c-${i}`,
      text,
      embedding,
      tokenEstimate: 20,
      courseId: String(i % 10),
      allowAiUse: true,
      publicationStatus: 'published',
      status: 'published',
    });
  }
  const indexMs = Date.now() - t0;

  const retriever = new Retriever({ embeddingProvider: provider, vectorStore: store });
  const searches = 50;
  const t1 = Date.now();
  let hits = 0;
  for (let i = 0; i < searches; i++) {
    const r = await retriever.retrieve(
      { text: 'compressor evaporador', topK: 8 },
      { channel: 'system' },
    );
    hits += r.results.length;
  }
  const searchMs = Date.now() - t1;

  console.log(
    JSON.stringify(
      {
        vectors: n,
        dimensions: dims,
        indexMs,
        indexPerSec: Math.round((n / indexMs) * 1000),
        searches,
        searchAvgMs: Math.round(searchMs / searches),
        avgHits: hits / searches,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
