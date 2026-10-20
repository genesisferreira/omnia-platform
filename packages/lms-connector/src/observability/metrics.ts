/**
 * Bridge de métricas do LMS connector → Prometheus registry (@omnia/monitoring).
 * Counters locais preservados para snapshot interno / testes.
 */

import {
  connectorActiveSessions,
  connectorCacheHitTotal,
  connectorCacheMissTotal,
  connectorHealthStatus,
  connectorRevokedSessions,
  lmsLoginFailure,
  lmsLoginSuccess,
  lmsSessionRevocations,
  lmsStudentsOnline,
  moodleErrorsTotal,
  moodleRequestDurationSeconds,
  moodleRequestsTotal,
  redisLatencySeconds,
  redisOperationsTotal,
} from '@omnia/monitoring/metrics';

type MoodleMetricSample = {
  functionName: string;
  durationMs: number;
  ok: boolean;
  code?: string;
};

type Counters = {
  calls: number;
  errors: number;
  byFunction: Record<string, { calls: number; errors: number; totalMs: number }>;
  sessionRevocations: number;
  cacheHits: number;
  cacheMisses: number;
};

const counters: Counters = {
  calls: 0,
  errors: 0,
  byFunction: {},
  sessionRevocations: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

function safeFnLabel(functionName: string): string {
  return functionName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80);
}

export function recordMoodleCall(sample: MoodleMetricSample): void {
  counters.calls += 1;
  if (!sample.ok) counters.errors += 1;
  const bucket = counters.byFunction[sample.functionName] ?? {
    calls: 0,
    errors: 0,
    totalMs: 0,
  };
  bucket.calls += 1;
  bucket.totalMs += sample.durationMs;
  if (!sample.ok) bucket.errors += 1;
  counters.byFunction[sample.functionName] = bucket;

  const labels = { function: safeFnLabel(sample.functionName) };
  moodleRequestsTotal.inc(labels);
  moodleRequestDurationSeconds.observe(labels, sample.durationMs / 1000);
  if (!sample.ok) {
    moodleErrorsTotal.inc({
      function: labels.function,
      code: sample.code || 'UNKNOWN',
    });
  }
}

export function recordSessionRevocation(): void {
  counters.sessionRevocations += 1;
  connectorRevokedSessions.inc();
  lmsSessionRevocations.inc();
}

export function recordCacheHit(): void {
  counters.cacheHits += 1;
  connectorCacheHitTotal.inc();
}

export function recordCacheMiss(): void {
  counters.cacheMisses += 1;
  connectorCacheMissTotal.inc();
}

export function recordRedisOp(operation: string, durationMs: number, ok: boolean): void {
  const labels = { operation: safeFnLabel(operation), result: ok ? 'ok' : 'error' };
  redisOperationsTotal.inc(labels);
  redisLatencySeconds.observe({ operation: labels.operation }, durationMs / 1000);
}

export function recordSessionCreate(ok: boolean): void {
  if (ok) lmsLoginSuccess.inc();
  else lmsLoginFailure.inc();
}

export function setActiveSessionsGauge(count: number): void {
  connectorActiveSessions.set({}, count);
  lmsStudentsOnline.set({}, count);
}

export function setConnectorHealthGauge(
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled',
): void {
  const value =
    status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : status === 'disabled' ? 0.25 : 0;
  connectorHealthStatus.set({}, value);
}

export function getLmsMetricsSnapshot(): Counters & {
  errorRate: number;
  cacheHitRate: number | null;
} {
  const totalCache = counters.cacheHits + counters.cacheMisses;
  return {
    ...counters,
    byFunction: { ...counters.byFunction },
    errorRate: counters.calls === 0 ? 0 : counters.errors / counters.calls,
    cacheHitRate: totalCache === 0 ? null : counters.cacheHits / totalCache,
  };
}

export function resetLmsMetricsForTests(): void {
  counters.calls = 0;
  counters.errors = 0;
  counters.byFunction = {};
  counters.sessionRevocations = 0;
  counters.cacheHits = 0;
  counters.cacheMisses = 0;
}
