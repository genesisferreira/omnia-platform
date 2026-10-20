import type { LmsConnectorHealth } from '@omnia/shared/lms';

import type { LmsConnectorConfig } from '../config/load-lms-config';
import { MoodleClient } from '../client/moodle-client';
import { MOODLE_READ_FUNCTIONS } from '../client/moodle-functions';
import type { LmsCache } from '../cache/lms-cache';
import type { LmsSessionManager } from '../session/session-manager';
import { lmsLog } from '../observability/log';
import {
  getLmsMetricsSnapshot,
  recordRedisOp,
  setActiveSessionsGauge,
  setConnectorHealthGauge,
} from '../observability/metrics';

export type HealthDeps = {
  config: LmsConnectorConfig;
  client: MoodleClient | null;
  sessions: LmsSessionManager | null;
  cache: LmsCache | null;
  /** Checks opcionais injetados pelo Admin BFF. */
  database?: { reachable: boolean; latencyMs: number | null };
  identityLinksActive?: number | null;
  platformVersion?: string | null;
};

/**
 * Healthcheck do connector — sem secrets, username técnico completo ou tokens.
 */
export async function checkConnectorHealth(deps: HealthDeps): Promise<LmsConnectorHealth> {
  const checkedAt = new Date().toISOString();
  const totalStarted = Date.now();
  const version = deps.platformVersion ?? process.env.APP_VERSION ?? null;
  const readOnly = deps.config.connectorReadOnly !== false;

  if (!deps.config.connectorEnabled) {
    setConnectorHealthGauge('disabled');
    return {
      status: 'disabled',
      version,
      readOnly,
      connector: { enabled: false, status: 'disabled' },
      moodle: {
        reachable: false,
        authenticated: false,
        version: null,
        latencyMs: null,
        serviceName: null,
      },
      redis: { reachable: false, latencyMs: null },
      database: deps.database ?? { reachable: false, latencyMs: null },
      identity: { engine: 'ok', activeLinks: deps.identityLinksActive ?? null },
      cache: { reachable: false, hitRate: null },
      sessions: { storeReachable: false, activeApprox: null },
      policies: { engine: 'ok' },
      latency: { moodleMs: null, redisMs: null, totalMs: Date.now() - totalStarted },
      sessionStore: { reachable: false },
      cacheStore: { reachable: false },
      mode: 'disabled',
      checkedAt,
    };
  }

  let redisLatencyMs: number | null = null;
  let sessionReachable = false;
  if (deps.sessions) {
    const started = Date.now();
    try {
      sessionReachable = await deps.sessions.ping();
      redisLatencyMs = Date.now() - started;
      recordRedisOp('session_ping', redisLatencyMs, sessionReachable);
    } catch {
      redisLatencyMs = Date.now() - started;
      recordRedisOp('session_ping', redisLatencyMs, false);
      sessionReachable = false;
    }
  }

  let cacheReachable = false;
  if (deps.cache) {
    const started = Date.now();
    try {
      cacheReachable = await deps.cache.ping();
      const ms = Date.now() - started;
      if (redisLatencyMs == null) redisLatencyMs = ms;
      recordRedisOp('cache_ping', ms, cacheReachable);
    } catch {
      recordRedisOp('cache_ping', Date.now() - started, false);
      cacheReachable = false;
    }
  }

  let moodleReachable = false;
  let authenticated = false;
  let moodleVersion: string | null = null;
  let moodleLatencyMs: number | null = null;
  const serviceName: string | null = deps.config.moodleServiceName || null;

  if (deps.client) {
    const started = Date.now();
    try {
      const info = await deps.client.call<{
        release?: string;
        version?: string;
        sitename?: string;
      }>(MOODLE_READ_FUNCTIONS.siteInfo, {}, { skipRetry: true });
      moodleLatencyMs = Date.now() - started;
      moodleReachable = true;
      authenticated = true;
      moodleVersion =
        (typeof info.release === 'string' && info.release) ||
        (typeof info.version === 'string' && info.version) ||
        null;
    } catch (err) {
      moodleLatencyMs = Date.now() - started;
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
  else if (!sessionReachable || !(deps.database?.reachable ?? true)) status = 'degraded';

  const snapshot = getLmsMetricsSnapshot();
  setConnectorHealthGauge(status);
  if (typeof deps.identityLinksActive === 'number') {
    // gauge atualizado no Admin via monitoring; aqui só health payload
  }

  return {
    status,
    version,
    readOnly,
    connector: { enabled: true, status },
    moodle: {
      reachable: moodleReachable,
      authenticated,
      version: moodleVersion,
      latencyMs: moodleLatencyMs,
      serviceName,
    },
    redis: { reachable: sessionReachable || cacheReachable, latencyMs: redisLatencyMs },
    database: deps.database ?? { reachable: true, latencyMs: null },
    identity: { engine: 'ok', activeLinks: deps.identityLinksActive ?? null },
    cache: { reachable: cacheReachable, hitRate: snapshot.cacheHitRate },
    sessions: { storeReachable: sessionReachable, activeApprox: null },
    policies: { engine: 'ok' },
    latency: {
      moodleMs: moodleLatencyMs,
      redisMs: redisLatencyMs,
      totalMs: Date.now() - totalStarted,
    },
    sessionStore: { reachable: sessionReachable },
    cacheStore: { reachable: cacheReachable },
    mode,
    checkedAt,
  };
}

export { setActiveSessionsGauge };
