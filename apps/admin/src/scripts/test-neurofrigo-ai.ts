/**
 * Homologação Epic 05 — Runtime + Retrieval + AISession (sem agentes/memória).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('neurofrigo-ai e2e', { concurrency: false }, () => {
  it('ask → retrieval → answer with citations → ai-session', async () => {
    process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

    const { getPayload } = await import('payload');
    const { default: config } = await import('../../payload.config');
    const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');

    const payload = await getPayload({ config });

    const embeddings = await payload.count({
      collection: 'embedding-records',
      where: { status: { equals: 'ready' } },
      overrideAccess: true,
    });
    assert.ok(embeddings.totalDocs >= 1, 'requer embeddings do Retrieval');

    const courses = await payload.find({
      collection: 'courses',
      limit: 1,
      overrideAccess: true,
    });
    assert.ok(courses.docs[0], 'requer curso');

    const { answer, sessionId } = await runNeurofrigoAsk(payload, {
      question: 'explique compressor e refrigeração industrial',
      identity: { role: 'student', language: 'pt-BR' },
      course: {
        courseId: String(courses.docs[0]!.id),
        courseTitle: String(courses.docs[0]!.title || ''),
      },
    });

    assert.ok(['ok', 'not_found'].includes(answer.status));
    assert.ok(answer.tookMs >= 0);
    assert.ok(answer.model);
    assert.ok(answer.provider);
    if (answer.status === 'ok') {
      assert.ok(answer.sources.length >= 1);
      assert.ok(answer.sources[0]?.citation.chunkId);
      assert.ok(answer.text.length > 0);
    }

    const session = await payload.findByID({
      collection: 'ai-sessions',
      id: sessionId,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(session.question.includes('compressor'), true);
    assert.ok(session.tookMs != null);
  });
});
