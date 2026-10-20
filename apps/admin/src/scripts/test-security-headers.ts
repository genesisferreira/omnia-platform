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

describe('headers de segurança do Admin', () => {
  it('desliga X-Powered-By', () => {
    assert.equal(nextConfig.poweredByHeader, false);
  });

  it('protege o painel e o login contra framing de outra origem', async () => {
    for (const path of ['/admin', '/admin/collections/users', '/login']) {
      assert.equal((await headersFor(path)).get('x-frame-options'), 'SAMEORIGIN', path);
    }
  });

  it('não bloqueia o iframe de mídia usado nas aulas do Portal', async () => {
    for (const path of ['/api/media/file/aula.pdf', '/api/partner-listing-media/file/x.png']) {
      const h = await headersFor(path);
      assert.equal(h.has('x-frame-options'), false, path);
      assert.equal(h.get('x-content-type-options'), 'nosniff', path);
    }
  });

  it('HSTS sem includeSubDomains e CSP somente em Report-Only', async () => {
    const h = await headersFor('/api/health');
    assert.doesNotMatch(h.get('strict-transport-security') ?? '', /includeSubDomains|preload/i);
    assert.equal(h.has('content-security-policy'), false);
    assert.ok(h.get('content-security-policy-report-only'));
  });
});
