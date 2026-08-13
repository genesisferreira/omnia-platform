import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveEstablishDestination, safePortalNextPath } from './portal-redirect';
import {
  assertNoInternalHostLeak,
  getConfiguredPublicOrigin,
  isInternalHostname,
  resolveBrowserLocation,
  sanitizeRelativePath,
  urlLeaksInternalHost,
} from './public-origin';

describe('public origin / browser redirect', () => {
  it('PUBLIC_ORIGIN_RESOLUTION_OK', () => {
    const staging = getConfiguredPublicOrigin({
      configuredUrl: 'https://dev.omniafrigo.com.br',
      nodeEnv: 'production',
      fallbackDev: 'http://localhost:3000',
    });
    assert.equal(staging.ok, true);
    if (staging.ok) assert.equal(staging.origin, 'https://dev.omniafrigo.com.br');

    const admin = getConfiguredPublicOrigin({
      configuredUrl: 'https://admin.dev.omniafrigo.com.br',
      nodeEnv: 'production',
      fallbackDev: 'http://localhost:3001',
    });
    assert.equal(admin.ok, true);
  });

  it('RELATIVE_REDIRECT_OK', () => {
    assert.equal(resolveBrowserLocation('/aluno'), '/aluno');
    assert.equal(resolveBrowserLocation('/aluno/onboarding'), '/aluno/onboarding');
    assert.equal(resolveBrowserLocation('/professor'), '/professor');
    assert.equal(resolveBrowserLocation('/ia'), '/ia');
  });

  it('NO_INTERNAL_HOST_LEAK_OK', () => {
    assert.equal(isInternalHostname('0.0.0.0'), true);
    assert.equal(isInternalHostname('localhost'), true);
    assert.equal(isInternalHostname('127.0.0.1'), true);
    assert.equal(isInternalHostname('::1'), true);
    assert.equal(isInternalHostname('web'), true);
    assert.equal(isInternalHostname('dev.omniafrigo.com.br'), false);
    assert.equal(urlLeaksInternalHost('https://0.0.0.0:3000/aluno'), true);
    assert.equal(urlLeaksInternalHost('/aluno'), false);
    assert.equal(assertNoInternalHostLeak('/aluno'), true);
    assert.equal(assertNoInternalHostLeak('https://0.0.0.0:3000/aluno'), false);
  });

  it('OPEN_REDIRECT_BLOCKED_OK', () => {
    assert.equal(sanitizeRelativePath('https://example.com', '/ia'), '/ia');
    assert.equal(sanitizeRelativePath('//example.com', '/ia'), '/ia');
    assert.equal(sanitizeRelativePath('https://evil.invalid', '/ia'), '/ia');
    assert.equal(sanitizeRelativePath('/aluno', '/ia'), '/aluno');
  });

  it('HOST_HEADER_INJECTION_BLOCKED_OK — production ignores request host and fails closed on internal config', () => {
    const leaked = getConfiguredPublicOrigin({
      configuredUrl: 'http://0.0.0.0:3000',
      nodeEnv: 'production',
      fallbackDev: 'http://localhost:3000',
    });
    assert.equal(leaked.ok, false);
    if (!leaked.ok) assert.equal(leaked.reason, 'INTERNAL');

    const explicitLocal = getConfiguredPublicOrigin({
      configuredUrl: 'http://localhost:3001',
      nodeEnv: 'production',
      fallbackDev: 'http://localhost:3001',
    });
    assert.equal(explicitLocal.ok, true);

    const missing = getConfiguredPublicOrigin({
      configuredUrl: '',
      nodeEnv: 'production',
      fallbackDev: 'http://localhost:3000',
    });
    assert.equal(missing.ok, false);

    const loc = resolveBrowserLocation('/aluno', '/ia');
    assert.equal(loc.startsWith('/'), true);
    assert.equal(urlLeaksInternalHost(loc), false);
  });

  it('does not build public URLs from HOST=0.0.0.0 PORT=3000', () => {
    const fromBind = getConfiguredPublicOrigin({
      configuredUrl: 'http://0.0.0.0:3000',
      nodeEnv: 'production',
      fallbackDev: 'http://0.0.0.0:3000',
    });
    assert.equal(fromBind.ok, false);
  });

  it('AUTH_ESTABLISH_REDIRECT_OK + role matrix', () => {
    assert.equal(resolveEstablishDestination('student', '/aluno'), '/aluno');
    assert.equal(resolveEstablishDestination('student', '/aluno/onboarding'), '/aluno/onboarding');
    assert.equal(resolveEstablishDestination('student', '/professor'), '/aluno');
    assert.equal(resolveEstablishDestination('student', 'https://0.0.0.0:3000/aluno'), '/aluno');
    assert.equal(resolveEstablishDestination('instructor', '/professor'), '/professor');
    assert.equal(resolveEstablishDestination('instructor', '/aluno'), '/professor');
    assert.equal(resolveEstablishDestination('admin', '/ia'), '/ia');
    assert.equal(resolveEstablishDestination('client', '/cursos'), '/cursos');
    assert.equal(resolveEstablishDestination('partner', '/ia'), '/ia');
    assert.equal(urlLeaksInternalHost(resolveEstablishDestination('student', '/aluno')), false);
  });

  it('FRED/CTE student and professor destinations stay relative', () => {
    assert.equal(resolveEstablishDestination('student', '/aluno'), '/aluno');
    assert.equal(resolveEstablishDestination('instructor', '/professor'), '/professor');
    assert.equal(safePortalNextPath('https://evil.invalid', '/ia'), '/ia');
    assert.equal(safePortalNextPath('//example.com', '/ia'), '/ia');
  });
});
