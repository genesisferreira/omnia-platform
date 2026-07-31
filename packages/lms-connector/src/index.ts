export {
  loadLmsConnectorConfig,
  assertLmsConfigUsable,
  redactToken,
  type LmsConnectorConfig,
  type LmsConfigIssue,
} from './config/load-lms-config';
export * from './errors';
export { MoodleClient, appendFormParams } from './client/moodle-client';
export {
  MOODLE_READ_FUNCTIONS,
  MOODLE_READ_FUNCTION_SET,
  IDEMPOTENT_MOODLE_FUNCTIONS,
  type MoodleReadFunction,
} from './client/moodle-functions';
export * from './mappers';
export {
  resolveLmsPolicy,
  type LmsPolicyContext,
  type LmsResolvedPolicy,
  type LmsPolicyScope,
} from './policy/resolve-lms-policy';
export {
  LmsSessionManager,
  createRedisFromUrl,
  lmsSessionNamespace,
  type CreateSessionInput,
  type CreateSessionResult,
  type RedisLike,
  type SessionManagerOptions,
} from './session/session-manager';
export {
  LmsCache,
  DEFAULT_LMS_CACHE_TTL,
  lmsCacheNamespace,
  type LmsCacheTtl,
} from './cache/lms-cache';
export { checkConnectorHealth, type HealthDeps } from './health/connector-health';
export { lmsLog } from './observability/log';
export {
  getLmsMetricsSnapshot,
  recordCacheHit,
  recordCacheMiss,
  recordMoodleCall,
  recordRedisOp,
  recordSessionCreate,
  recordSessionRevocation,
  resetLmsMetricsForTests,
  setActiveSessionsGauge,
  setConnectorHealthGauge,
} from './observability/metrics';
