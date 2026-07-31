import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MoodleClient, appendFormParams } from './moodle-client';
import type { LmsConnectorConfig } from '../config/load-lms-config';
import {
  MoodleAuthenticationError,
  MoodlePermissionError,
  MoodleTimeoutError,
  MoodleUnavailableError,
  MoodleUnexpectedResponseError,
  MoodleValidationError,
} from '../errors';
import { MOODLE_READ_FUNCTIONS } from './moodle-functions';

function baseConfig(overrides: Partial<LmsConnectorConfig> = {}): LmsConnectorConfig {
  return {
    moodleBaseUrl: 'https://moodle.test',
    moodleInternalUrl: 'https://moodle.test',
    moodleRestToken: 'super-secret-token-value',
    moodleServiceName: 'omnia_lms_readonly',
    moodleRequestTimeoutMs: 1000,
    connectorEnabled: true,
    connectorReadOnly: true,
    provisionEnabled: true,
    provisionDryRun: true,
    provisionExecuteEnabled: false,
    sessionPolicyEnabled: true,
    defaultStudentSessions: 1,
    defaultTeacherSessions: 2,
    defaultManagerSessions: 2,
    defaultAdminSessions: 2,
    sessionTtlSeconds: 3600,
    sessionHeartbeatSeconds: 60,
    redisUrl: null,
    appEnv: 'test',
    ...overrides,
  };
}

describe('MoodleClient', () => {
  it('sucesso retorna JSON tipado', async () => {
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () =>
        new Response(JSON.stringify({ sitename: 'Omnia', release: '4.5.12' }), {
          status: 200,
        }),
      maxRetries: 0,
    });
    const info = await client.call<{ sitename: string }>(MOODLE_READ_FUNCTIONS.siteInfo);
    assert.equal(info.sitename, 'Omnia');
  });

  it('rejeita função fora da whitelist', async () => {
    const client = new MoodleClient({ config: baseConfig(), maxRetries: 0 });
    await assert.rejects(
      () => client.call('core_user_create_users', {}),
      (err: unknown) => err instanceof MoodleValidationError,
    );
  });

  it('token inválido → MoodleAuthenticationError', async () => {
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ exception: 'moodle_exception', errorcode: 'invalidtoken' }),
          { status: 200 },
        ),
      maxRetries: 0,
    });
    await assert.rejects(
      () => client.call(MOODLE_READ_FUNCTIONS.siteInfo),
      (err: unknown) => err instanceof MoodleAuthenticationError,
    );
  });

  it('permissão negada → MoodlePermissionError', async () => {
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ exception: 'required_capability_exception', errorcode: 'nopermission' }),
          { status: 200 },
        ),
      maxRetries: 0,
    });
    await assert.rejects(
      () => client.call(MOODLE_READ_FUNCTIONS.getCourses),
      (err: unknown) => err instanceof MoodlePermissionError,
    );
  });

  it('JSON inválido → MoodleUnexpectedResponseError', async () => {
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () => new Response('not-json', { status: 200 }),
      maxRetries: 0,
    });
    await assert.rejects(
      () => client.call(MOODLE_READ_FUNCTIONS.siteInfo),
      (err: unknown) => err instanceof MoodleUnexpectedResponseError,
    );
  });

  it('rede indisponível → MoodleUnavailableError sem vazar token', async () => {
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () => {
        throw new Error('connect failed with super-secret-token-value');
      },
      maxRetries: 0,
    });
    await assert.rejects(
      () => client.call(MOODLE_READ_FUNCTIONS.siteInfo),
      (err: unknown) => {
        assert.ok(err instanceof MoodleUnavailableError);
        assert.equal(err.message.includes('super-secret-token-value'), false);
        assert.ok(err.message.includes('[redacted]') || err.message.includes('…'));
        return true;
      },
    );
  });

  it('timeout → MoodleTimeoutError', async () => {
    const client = new MoodleClient({
      config: baseConfig({ moodleRequestTimeoutMs: 20 }),
      fetchImpl: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        }),
      maxRetries: 0,
    });
    await assert.rejects(
      () => client.call(MOODLE_READ_FUNCTIONS.siteInfo),
      (err: unknown) => err instanceof MoodleTimeoutError,
    );
  });

  it('retry idempotente em falha de rede', async () => {
    let attempts = 0;
    const client = new MoodleClient({
      config: baseConfig(),
      fetchImpl: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('temporary');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      maxRetries: 2,
    });
    await client.call(MOODLE_READ_FUNCTIONS.siteInfo);
    assert.equal(attempts, 2);
  });

  it('appendFormParams serializa arrays aninhados', () => {
    const body = new URLSearchParams();
    appendFormParams(body, { field: 'email', values: ['a@b.com'] });
    assert.equal(body.get('field'), 'email');
    assert.equal(body.get('values[0]'), 'a@b.com');
  });

  it('callWrite dry-run não chama fetch', async () => {
    let fetchCalls = 0;
    const client = new MoodleClient({
      config: baseConfig({ provisionExecuteEnabled: false, provisionDryRun: true }),
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response('{}', { status: 200 });
      },
      maxRetries: 0,
    });
    const result = await client.callWrite('core_user_create_users', {
      users: [{ username: 'x', email: 'x@y.z', firstname: 'A', lastname: 'B' }],
    });
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.code, 'EXECUTE_DISABLED_UNTIL_ACTIVATION');
    assert.equal(fetchCalls, 0);
  });

  it('callWrite rejeita função fora da write allowlist', async () => {
    const client = new MoodleClient({ config: baseConfig(), maxRetries: 0 });
    await assert.rejects(
      () => client.callWrite('core_webservice_get_site_info', {}),
      (err: unknown) => err instanceof MoodleValidationError,
    );
  });

  it('listWriteCapabilities retorna catálogo', () => {
    const client = new MoodleClient({ config: baseConfig(), maxRetries: 0 });
    const caps = client.listWriteCapabilities();
    assert.ok(caps.length >= 4);
    assert.ok(caps.some((c) => c.functionName === 'core_user_create_users'));
  });
});
