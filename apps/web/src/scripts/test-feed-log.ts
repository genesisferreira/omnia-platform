/**
 * Testes — logs e classificação de falha dos feeds SEO.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CmsFeedHttpError } from '../lib/seo/cms-feed-client';
import { classifyFetchFailure } from '../lib/seo/feed-log';

describe('classifyFetchFailure', () => {
  it('classifica AbortError como timeout', () => {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    assert.equal(classifyFetchFailure(err), 'timeout');
  });

  it('classifica CmsFeedHttpError como http_not_ok', () => {
    assert.equal(classifyFetchFailure(new CmsFeedHttpError(503)), 'http_not_ok');
  });

  it('classifica payload inválido', () => {
    assert.equal(classifyFetchFailure(new Error('invalid_payload')), 'invalid_payload');
  });

  it('classifica demais erros como network', () => {
    assert.equal(classifyFetchFailure(new Error('ECONNREFUSED')), 'network');
  });
});
