/* eslint-disable no-console -- test harness */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getAllowedCorsOrigins } from '../lib/allowed-origins';

describe('allowed cors origins', () => {
  it('inclui apex, www e admin em produção', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://omniafrigo.com.br',
      NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
    });
    assert.ok(origins.includes('https://omniafrigo.com.br'));
    assert.ok(origins.includes('https://www.omniafrigo.com.br'));
    assert.ok(origins.includes('https://admin.omniafrigo.com.br'));
    assert.equal(origins.includes('http://localhost:3000'), false);
  });

  it('permite localhost apenas fora de production', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
    });
    assert.ok(origins.includes('http://localhost:3000'));
    assert.ok(origins.includes('http://localhost:3001'));
  });
});

console.log('test-allowed-origins: ok');
