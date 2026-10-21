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

  it('mantém exatamente a lista atual de produção', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://omniafrigo.com.br',
      NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
    });
    assert.deepEqual(origins, [
      'https://omniafrigo.com.br',
      'https://admin.omniafrigo.com.br',
      'https://www.omniafrigo.com.br',
    ]);
  });

  it('aceita o novo domínio com www e o Admin ainda no domínio antigo', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://omniafrigoholding.com.br',
      NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
    });
    assert.ok(origins.includes('https://omniafrigoholding.com.br'));
    assert.ok(origins.includes('https://www.omniafrigoholding.com.br'));
    assert.ok(origins.includes('https://admin.omniafrigo.com.br'));
    assert.equal(origins.includes('https://omniafrigo.com.br'), false);
  });

  it('origens de transição: só origem pura e https em produção', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://omniafrigoholding.com.br',
      OMNIA_EXTRA_TRUSTED_ORIGINS:
        'https://omniafrigo.com.br, http://inseguro.example, https://x.example/caminho, invalida,',
    });
    assert.ok(origins.includes('https://omniafrigo.com.br'));
    assert.equal(origins.includes('http://inseguro.example'), false);
    assert.equal(
      origins.some((o) => o.startsWith('https://x.example')),
      false,
    );
    assert.equal(origins.includes('invalida'), false);
  });

  it('não gera www para subdomínios (DEV)', () => {
    const origins = getAllowedCorsOrigins({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://dev.omniafrigo.com.br',
      NEXT_PUBLIC_ADMIN_URL: 'https://admin.dev.omniafrigo.com.br',
    });
    assert.deepEqual(origins, [
      'https://dev.omniafrigo.com.br',
      'https://admin.dev.omniafrigo.com.br',
    ]);
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
