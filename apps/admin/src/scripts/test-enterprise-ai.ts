/**
 * Smoke test script marker — unit tests live in @omnia/enterprise-ai.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('enterprise-ai admin smoke', () => {
  it('package export path is wired', async () => {
    const mod = await import('@omnia/enterprise-ai');
    assert.equal(typeof mod.evaluatePolicies, 'function');
    assert.equal(typeof mod.resolveAssistantRuntime, 'function');
    assert.equal(typeof mod.composeSystemPrompt, 'function');
    assert.ok(mod.PROMPT_KINDS.includes('system'));
  });
});
