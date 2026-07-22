/**
 * Testes — timeout CMS fetch (Release 2.1.1).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_CMS_FETCH_TIMEOUT_MS,
  fetchWithCmsTimeout,
  getCmsFetchTimeoutMs,
  isAbortError,
} from '../lib/cms/cms-fetch';

describe('getCmsFetchTimeoutMs', () => {
  it('usa default seguro sem env', () => {
    assert.equal(getCmsFetchTimeoutMs({}), DEFAULT_CMS_FETCH_TIMEOUT_MS);
  });

  it('respeita CMS_FETCH_TIMEOUT_MS válido', () => {
    assert.equal(getCmsFetchTimeoutMs({ CMS_FETCH_TIMEOUT_MS: '2500' }), 2500);
  });

  it('ignora valores inválidos ou fora da faixa', () => {
    assert.equal(getCmsFetchTimeoutMs({ CMS_FETCH_TIMEOUT_MS: 'abc' }), DEFAULT_CMS_FETCH_TIMEOUT_MS);
    assert.equal(getCmsFetchTimeoutMs({ CMS_FETCH_TIMEOUT_MS: '50' }), DEFAULT_CMS_FETCH_TIMEOUT_MS);
    assert.equal(
      getCmsFetchTimeoutMs({ CMS_FETCH_TIMEOUT_MS: '999999' }),
      DEFAULT_CMS_FETCH_TIMEOUT_MS,
    );
  });
});

describe('fetchWithCmsTimeout', () => {
  it('propaga AbortError quando a conexão nunca responde', async () => {
    // Simula hang de rede: não resolve sozinho; só rejeita se o signal abortar.
    // (Sem isso, sobra Promise zumbi e o node:test cancela a suite.)
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          return;
        }
        const onAbort = () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      });

    await assert.rejects(
      () =>
        fetchWithCmsTimeout('https://example.invalid/cms', {
          timeoutMs: 50,
          fetchImpl: hangingFetch,
        }),
      (error: unknown) => isAbortError(error),
    );
  });

  it('AbortController externo também aborta', async () => {
    const controller = new AbortController();
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          return;
        }
        signal.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });

    setTimeout(() => controller.abort(), 20);

    await assert.rejects(
      () =>
        fetchWithCmsTimeout('https://example.invalid/cms', {
          timeoutMs: 5_000,
          signal: controller.signal,
          fetchImpl: hangingFetch,
        }),
      (error: unknown) => isAbortError(error),
    );
  });

  it('retorna Response em sucesso', async () => {
    const okFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });

    const res = await fetchWithCmsTimeout('https://example.invalid/cms', {
      timeoutMs: 1_000,
      fetchImpl: okFetch,
    });
    assert.equal(res.status, 200);
  });

  it('propaga Response HTTP não-OK sem lançar', async () => {
    const badFetch: typeof fetch = async () => new Response('unavailable', { status: 503 });
    const res = await fetchWithCmsTimeout('https://example.invalid/cms', {
      timeoutMs: 1_000,
      fetchImpl: badFetch,
    });
    assert.equal(res.status, 503);
    assert.equal(res.ok, false);
  });
});
