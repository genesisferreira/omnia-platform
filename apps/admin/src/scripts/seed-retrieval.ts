/**
 * Seed Retrieval Engine — processa fila de embeddings e valida busca semântica.
 * Uso: pnpm --filter @omnia/admin seed:retrieval
 *
 * Pré-requisito: seed:knowledge-intelligence (chunks + fila pending).
 * Sem LLM / Chat / Runtime.
 */
export {};

async function main() {
  process.env.RETRIEVAL_EMBEDDING_PROVIDER =
    process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { processEmbeddingQueue } = await import('../services/retrieval/worker');
  const { runSemanticSearch } = await import('../services/retrieval/search');
  const { refreshRetrievalDashboard } = await import('../services/retrieval/dashboard');
  const { reindex } = await import('../services/retrieval/reindex');

  const payload = await getPayload({ config });

  const pendingBefore = await payload.count({
    collection: 'embedding-queue',
    where: { status: { equals: 'pending' } },
    overrideAccess: true,
  });

  if (pendingBefore.totalDocs === 0) {
    console.log('RETRIEVAL_SEED_NO_PENDING — enfileirando reindex full de recursos completed');
    await reindex({ payload, mode: 'full' });
  }

  const worker = await processEmbeddingQueue(payload, { limit: 50 });
  console.log('RETRIEVAL_WORKER', JSON.stringify(worker));

  const search = await runSemanticSearch(
    payload,
    {
      text: 'compressor refrigeração industrial válvula expansão',
      topK: 5,
      language: 'pt-BR',
    },
    { channel: 'system' },
  );

  console.log(
    'RETRIEVAL_SEARCH',
    JSON.stringify({
      resultCount: search.results.length,
      tookMs: search.tookMs,
      provider: search.provider,
      firstCitation: search.results[0]?.citation ?? null,
      recoveredTokens: search.recoveredTokens,
    }),
  );

  await refreshRetrievalDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'retrieval-dashboard',
    overrideAccess: true,
  });

  console.log(
    'RETRIEVAL_DASHBOARD',
    JSON.stringify({
      embeddingsReady: dash.embeddingsReady,
      vectorCount: dash.vectorCount,
      queuePending: dash.queuePending,
      avgSearchMs: dash.avgSearchMs,
      searchSessionsCount: dash.searchSessionsCount,
    }),
  );

  if (worker.completed < 1 && search.results.length < 1) {
    throw new Error('RETRIEVAL_SEED_FAILED — sem embeddings nem resultados');
  }

  console.log('RETRIEVAL_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
