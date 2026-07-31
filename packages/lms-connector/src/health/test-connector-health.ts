import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LmsConnectorConfig } from '../config/load-lms-config';
import { checkConnectorHealth } from './connector-health';
import { resetLmsMetricsForTests } from '../observability/metrics';

const baseConfig: LmsConnectorConfig = {
  connectorEnabled: false,
  connectorReadOnly: true,
  moodleBaseUrl: 'https://moodle.example',
  moodleInternalUrl: '',
  moodleRestToken: 'SUPER_SECRET_TOKEN',
  moodleServiceName: 'omnia_lms_readonly',
  moodleRequestTimeoutMs: 5000,
  appEnv: 'test',
  redisUrl: null,
  defaultStudentSessions: 1,
  defaultTeacherSessions: 2,
  defaultManagerSessions: 3,
  defaultAdminSessions: 5,
  sessionTtlSeconds: 3600,
  sessionHeartbeatSeconds: 60,
  sessionPolicyEnabled: true,
};

describe('expanded connector health', () => {
  it('returns disabled payload without secrets', async () => {
    resetLmsMetricsForTests();
    const health = await checkConnectorHealth({
      config: baseConfig,
      client: null,
      sessions: null,
      cache: null,
      platformVersion: '2.5.3-test',
    });

    assert.equal(health.status, 'disabled');
    assert.equal(health.readOnly, true);
    assert.equal(health.connector.enabled, false);
    assert.equal(health.version, '2.5.3-test');
    assert.ok(health.policies.engine === 'ok');
    const serialized = JSON.stringify(health);
    assert.doesNotMatch(serialized, /SUPER_SECRET_TOKEN/);
    assert.ok('redis' in health);
    assert.ok('database' in health);
    assert.ok('identity' in health);
    assert.ok('latency' in health);
  });
});
