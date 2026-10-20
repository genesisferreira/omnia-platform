import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import nextConfig from '../../next.config';

async function headersFor(path: string): Promise<Map<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const found = new Map<string, string>();
  for (const rule of rules) {
    const pattern = new RegExp(`^${rule.source.replace(':path*', '.*')}$`);
    if (!pattern.test(path)) continue;
    for (const h of rule.headers) found.set(h.key.toLowerCase(), h.value);
  }
  return found;
}

describe('headers de segurança do Portal', () => {
  it('desliga X-Powered-By', () => {
    assert.equal(nextConfig.poweredByHeader, false);
  });

  it('aplica os headers básicos em qualquer rota', async () => {
    for (const path of ['/', '/marketplace', '/aluno/cursos', '/api/parceiro/midia']) {
      const h = await headersFor(path);
      assert.equal(h.get('x-content-type-options'), 'nosniff', path);
      assert.equal(h.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
      assert.equal(h.get('x-frame-options'), 'SAMEORIGIN', path);
      assert.match(h.get('permissions-policy') ?? '', /geolocation=\(self\)/, path);
    }
  });

  it('HSTS sem includeSubDomains nem preload enquanto os subdomínios não forem mapeados', async () => {
    const hsts = (await headersFor('/')).get('strict-transport-security') ?? '';
    assert.match(hsts, /^max-age=\d+$/);
    assert.doesNotMatch(hsts, /includeSubDomains|preload/i);
  });

  it('CSP apenas em Report-Only (não bloqueia)', async () => {
    const h = await headersFor('/');
    assert.equal(h.has('content-security-policy'), false);
    const csp = h.get('content-security-policy-report-only') ?? '';
    assert.match(csp, /frame-ancestors 'self'/);
    assert.match(csp, /object-src 'none'/);
  });
});
