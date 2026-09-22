import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('ai-experience e2e', { concurrency: false }, () => {
  it('follow-up session + grounding + feedback + not_found', async () => {
    process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

    const { getPayload } = await import('payload');
    const { default: config } = await import('../../payload.config');
    const { runNeurofrigoAsk, submitAiFeedback } = await import('../services/neurofrigo/ask');

    const payload = await getPayload({ config });
    const courses = await payload.find({ collection: 'courses', limit: 1, overrideAccess: true });
    assert.ok(courses.docs[0]);

    const a1 = await runNeurofrigoAsk(payload, {
      question: 'explique compressor refrigeração',
      identity: { role: 'student' },
      course: {
        courseId: String(courses.docs[0]!.id),
        courseTitle: String(courses.docs[0]!.title || ''),
      },
    });
    assert.ok(a1.answer.formattedText);
    assert.ok(a1.answer.explainability || a1.answer.status === 'not_found');

    const a2 = await runNeurofrigoAsk(payload, {
      question: 'e qual a diferença para o evaporador?',
      sessionId: a1.sessionId,
      identity: { role: 'student' },
      course: {
        courseId: String(courses.docs[0]!.id),
        courseTitle: String(courses.docs[0]!.title || ''),
      },
    });
    assert.equal(a2.sessionId, a1.sessionId);

    const session = await payload.findByID({
      collection: 'ai-sessions',
      id: a2.sessionId,
      depth: 0,
      overrideAccess: true,
    });
    assert.ok(Array.isArray(session.turns));
    assert.ok((session.turns as unknown[]).length >= 2);

    const fb = await submitAiFeedback(payload, {
      sessionId: a2.sessionId,
      rating: 'down',
      comment: 'faltou diagrama',
    });
    assert.ok(fb.id);
  });
});
