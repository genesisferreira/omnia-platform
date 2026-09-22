/**
 * Homologação Epic 04 — Retrieval Engine (sem LLM).
 * Fluxo: chunks → embeddings → vector store → busca → ranking → citations → session.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('retrieval e2e', { concurrency: false }, () => {
  it('queue → embed → search → citations → search-session', async () => {
    process.env.RETRIEVAL_EMBEDDING_PROVIDER =
      process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic';

    const { getPayload } = await import('payload');
    const { default: config } = await import('../../payload.config');
    const { processEmbeddingQueue } = await import('../services/retrieval/worker');
    const { runSemanticSearch } = await import('../services/retrieval/search');
    const { reindex } = await import('../services/retrieval/reindex');

    const payload = await getPayload({ config });

    const chunks = await payload.count({
      collection: 'knowledge-chunks',
      overrideAccess: true,
    });
    assert.ok(chunks.totalDocs > 0, 'requer chunks do Knowledge Intelligence');

    const pending = await payload.count({
      collection: 'embedding-queue',
      where: { status: { in: ['pending', 'failed'] } },
      overrideAccess: true,
    });
    if (pending.totalDocs === 0) {
      await reindex({ payload, mode: 'full' });
    }

    // reset failed → pending for retry
    const failed = await payload.find({
      collection: 'embedding-queue',
      where: { status: { equals: 'failed' } },
      limit: 50,
      overrideAccess: true,
    });
    for (const item of failed.docs) {
      await payload.update({
        collection: 'embedding-queue',
        id: item.id,
        data: { status: 'pending', lastError: null, attempts: 0 },
        overrideAccess: true,
        context: { retrievalPipelineActive: true },
      });
    }

    const worker = await processEmbeddingQueue(payload, { limit: 30 });
    assert.ok(worker.completed >= 1, `esperado completed>=1, got ${JSON.stringify(worker)}`);

    const embeddings = await payload.count({
      collection: 'embedding-records',
      where: { status: { equals: 'ready' } },
      overrideAccess: true,
    });
    assert.ok(embeddings.totalDocs >= 1);

    const result = await runSemanticSearch(
      payload,
      { text: 'refrigeração compressor ciclo', topK: 5 },
      { channel: 'system' },
    );

    assert.ok(result.results.length >= 1);
    assert.ok(result.results[0]?.citation.chunkId);
    assert.equal(typeof result.results[0]?.score, 'number');
    assert.ok(result.provider);

    const sessions = await payload.count({
      collection: 'search-sessions',
      overrideAccess: true,
    });
    assert.ok(sessions.totalDocs >= 1);

    // ACL: portal channel should still return published+allowAiUse content
    const portal = await runSemanticSearch(
      payload,
      { text: 'refrigeração', topK: 3 },
      { channel: 'portal_chat' },
    );
    assert.ok(portal.results.every((r) => r.citation.chunkId));
  });
});
