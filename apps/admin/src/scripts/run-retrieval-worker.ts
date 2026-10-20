/**
 * Executa um ciclo do worker de embeddings.
 * Uso: pnpm --filter @omnia/admin retrieval:worker
 */
export {};

async function main() {
  const limit = Number(process.env.RETRIEVAL_WORKER_LIMIT || 20);
  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { processEmbeddingQueue } = await import('../services/retrieval/worker');

  const payload = await getPayload({ config });
  const result = await processEmbeddingQueue(payload, { limit });
  console.log(JSON.stringify({ ok: true, data: result }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
