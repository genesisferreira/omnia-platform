/**
 * Smoke test script marker — unit tests live in @omnia/neurofrigo-tutor.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('tutor-ia admin smoke', () => {
  it('package export path is wired', async () => {
    const mod = await import('@omnia/neurofrigo-tutor');
    assert.equal(typeof mod.TutorService, 'function');
    assert.ok(mod.LEARNING_LEVELS.includes('beginner'));
  });
});
