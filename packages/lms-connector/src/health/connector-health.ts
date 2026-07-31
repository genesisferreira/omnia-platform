import type { LmsConnectorHealth } from '@omnia/shared/lms';

import type { LmsConnectorConfig } from '../config/load-lms-config';
import { MoodleClient } from '../client/moodle-client';
import { MOODLE_READ_FUNCTIONS } from '../client/moodle-functions';
import type { LmsCache } from '../cache/lms-cache';
import type { LmsSessionManager } from '../session/session-manager';
import { lmsLog } from '../observability/log';

export type HealthDeps = {
  config: LmsConnectorConfig;
  client: MoodleClient | null;
  sessions: LmsSessionManager | null;
  cache: LmsCache | null;
};

/**
 * Healthcheck do connector — sem secrets, username técnico completo ou tokens.
 */
export async function checkConnectorHealth(deps: HealthDeps): Promise<LmsConnectorHealth> {
  const checkedAt = new Date().toISOString();

  if (!deps.config.connectorEnabled) {
    return {
      status: 'disabled',
      moodle: {
        reachable: false,
        authenticated: false,
        version: null,
        latencyMs: null,
        serviceName: null,
      },
      sessionStore: { reachable: false },
      cacheStore: { reachable: false },
      mode: 'disabled',
      checkedAt,
    };
  }

  const sessionReachable = deps.sessions ? await deps.sessions.ping() : false;
  const cacheReachable = deps.cache ? await deps.cache.ping() : false;

  let moodleReachable = false;
  let authenticated = false;
  let version: string | null = null;
  let latencyMs: number | null = null;
  let serviceName: string | null = deps.config.moodleServiceName || null;

  if (deps.client) {
    const started = Date.now();
    try {
      const info = await deps.client.call<{
        release?: string;
        version?: string;
        sitename?: string;
      }>(MOODLE_READ_FUNCTIONS.siteInfo, {}, { skipRetry: true });
      latencyMs = Date.now() - started;
      moodleReachable = true;
      authenticated = true;
      version =
        (typeof info.release === 'string' && info.release) ||
        (typeof info.version === 'string' && info.version) ||
        null;
    } catch (err) {
      latencyMs = Date.now() - started;
      moodleReachable = false;
      authenticated = false;
      lmsLog('warn', 'lms.health.moodle_failed', {
        code: err instanceof Error ? err.name : 'UNKNOWN',
      });
    }
  }

  const mode = deps.config.connectorReadOnly ? 'read_only' : 'read_write';
  let status: LmsConnectorHealth['status'] = 'healthy';
  if (!moodleReachable || !authenticated) status = 'unhealthy';
  else if (!sessionReachable) status = 'degraded';

  return {
    status,
    moodle: {
      reachable: moodleReachable,
      authenticated,
      version,
      latencyMs,
      serviceName,
    },
    sessionStore: { reachable: sessionReachable },
    cacheStore: { reachable: cacheReachable },
    mode,
    checkedAt,
  };
}
