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

  it('normalizes base url without /v1', async () => {
    const { normalizeDeepseekBaseUrl } = await import('./adapters/llm/deepseek');
    assert.equal(
      normalizeDeepseekBaseUrl('https://api.deepseek.com'),
      'https://api.deepseek.com/v1',
    );
    assert.equal(
      normalizeDeepseekBaseUrl('https://api.deepseek.com/v1/'),
      'https://api.deepseek.com/v1',
    );
  });

  it('disables V4 thinking by default and reads content', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'ok-deepseek', reasoning_content: 'think' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const p = new DeepSeekChatProvider({
      apiKey: 'test-key',
      model: 'deepseek-v4-flash',
      fetchImpl,
      maxRetries: 0,
    });
    const out = await p.complete({ system: 's', user: 'u', maxTokens: 64 });
    assert.equal(out.text, 'ok-deepseek');
    assert.equal(out.provider, 'deepseek');
    assert.deepEqual(capturedBody?.thinking, { type: 'disabled' });
  });

  it('falls back to reasoning_content when content is empty', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '', reasoning_content: 'only-cot' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    const p = new DeepSeekChatProvider({
      apiKey: 'test-key',
      model: 'deepseek-v4-flash',
      fetchImpl,
      maxRetries: 0,
    });
    const out = await p.complete({ system: 's', user: 'u', maxTokens: 16 });
    assert.equal(out.text, 'only-cot');
  });
});
