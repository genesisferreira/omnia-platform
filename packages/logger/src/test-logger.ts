import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLogger, sanitizeLogFields } from './index';

describe('@omnia/logger', () => {
  it('redacts secrets', () => {
    const out = sanitizeLogFields({
      password: 'secret',
      authorization: 'Bearer x',
      wstoken: 'abc',
      route: '/health',
    });
    assert.equal(out.password, '[redacted]');
    assert.equal(out.authorization, '[redacted]');
    assert.equal(out.wstoken, '[redacted]');
    assert.equal(out.route, '/health');
  });

  it('creates structured logger', () => {
    const logger = createLogger({ service: 'test', environment: 'test' });
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.child({ requestId: 'r1' }).warn, 'function');
  });
});
