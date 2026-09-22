export { LMS_SLO, type LmsSlo } from './slo';

/** Descrições de alertas (Prometheus rule files espelham estes IDs). */
export const LMS_ALERT_DEFS = [
  {
    id: 'MoodleUnavailable',
    summary: 'Moodle DEV/staging unreachable or unauthenticated',
    severity: 'critical',
  },
  {
    id: 'RedisUnavailable',
    summary: 'LMS session/cache Redis unreachable',
    severity: 'critical',
  },
  {
    id: 'HighErrorRate',
    summary: 'HTTP/LMS error rate > 5%',
    severity: 'warning',
  },
  {
    id: 'HighLatency',
    summary: 'HTTP P95 or Moodle latency above threshold',
    severity: 'warning',
  },
  {
    id: 'ConnectorHealthDown',
    summary: 'connector_health_status == 0',
    severity: 'critical',
  },
  {
    id: 'MoodleAuthFailure',
    summary: 'Moodle authentication failures detected',
    severity: 'critical',
  },
  {
    id: 'ConnectorDisabled',
    summary: 'Connector disabled while expected enabled',
    severity: 'warning',
  },
  {
    id: 'SessionRevocationSpike',
    summary: 'Session revocations above baseline',
    severity: 'warning',
  },
  {
    id: 'LowCacheHitRate',
    summary: 'Cache hit rate below 50%',
    severity: 'info',
  },
] as const;
