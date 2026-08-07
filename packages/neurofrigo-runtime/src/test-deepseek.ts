import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DeepSeekChatProvider } from './adapters/llm/deepseek';
import { createLLMProviderWithMeta } from './factory';

describe('deepseek adapter', () => {
  it('reports metadata without calling network', () => {
    const p = new DeepSeekChatProvider({
      apiKey: 'test-key',
      model: 'deepseek-chat',
    });
    assert.deepEqual(p.metadata(), { name: 'deepseek', model: 'deepseek-chat' });
  });

  it('falls back to grounded with audited reason when key missing', () => {
    const created = createLLMProviderWithMeta(
      {
        NEUROFRIGO_LLM_PROVIDER: 'deepseek',
        NEUROFRIGO_LLM_FALLBACK: 'grounded',
      },
      { provider: 'deepseek', model: 'deepseek-chat' },
    );
    assert.equal(created.providerRequested, 'deepseek');
    assert.equal(created.providerUsed, 'grounded');
    assert.ok(created.fallbackReason);
  });
});
