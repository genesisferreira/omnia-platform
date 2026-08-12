import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('deepseek-agents admin smoke', () => {
  it('orchestrator + runtime deepseek exports are wired', async () => {
    const orch = await import('@omnia/neurofrigo-orchestrator');
    const runtime = await import('@omnia/neurofrigo-runtime');
    assert.equal(typeof orch.planPortalTurn, 'function');
    assert.equal(typeof orch.evaluateBudget, 'function');
    assert.equal(typeof runtime.DeepSeekChatProvider, 'function');
    assert.equal(typeof runtime.createLLMProviderWithMeta, 'function');
    assert.ok(orch.OFFICIAL_SPECIALIST_KEYS.includes('hvac'));
  });
});
