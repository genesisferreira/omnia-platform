import {
  LmsCache,
  LmsSessionManager,
  MoodleClient,
  assertLmsConfigUsable,
  createRedisFromUrl,
  loadLmsConnectorConfig,
  lmsCacheNamespace,
  resolveLmsPolicy,
  type LmsConnectorConfig,
  type RedisLike,
} from '@omnia/lms-connector';
import type { LmsProfileRole } from '@omnia/shared/lms';

let cachedRedis: RedisLike | null | undefined;
let cachedClient: MoodleClient | null = null;
let cachedConfig: LmsConnectorConfig | null = null;
let cachedSessions: LmsSessionManager | null = null;
let cachedCache: LmsCache | null = null;

async function getRedis(config: LmsConnectorConfig): Promise<RedisLike | null> {
  if (cachedRedis !== undefined) return cachedRedis;
  if (!config.redisUrl) {
    cachedRedis = null;
    return null;
  }
  try {
    cachedRedis = await createRedisFromUrl(config.redisUrl);
    return cachedRedis;
  } catch {
    cachedRedis = null;
    return null;
  }
}

export function getRuntimeLmsConfig(): LmsConnectorConfig {
  if (cachedConfig) return cachedConfig;
  const { config, issues } = loadLmsConnectorConfig();
  if (config.connectorEnabled) {
    assertLmsConfigUsable(config, issues);
  }
  cachedConfig = config;
  return config;
}

export async function getMoodleClient(): Promise<MoodleClient> {
  const config = getRuntimeLmsConfig();
  if (!cachedClient) {
    cachedClient = new MoodleClient({ config });
  }
  return cachedClient;
}

export async function getLmsSessionManager(): Promise<LmsSessionManager> {
  if (cachedSessions) return cachedSessions;
  const config = getRuntimeLmsConfig();
  const redis = await getRedis(config);
  cachedSessions = new LmsSessionManager({
    redis,
    appEnv: config.appEnv,
    allowMemoryFallback: config.appEnv === 'development' || config.appEnv === 'test',
  });
  return cachedSessions;
}

export async function getLmsCache(): Promise<LmsCache> {
  if (cachedCache) return cachedCache;
  const config = getRuntimeLmsConfig();
  const redis = await getRedis(config);
  cachedCache = new LmsCache(redis, lmsCacheNamespace(config.appEnv));
  return cachedCache;
}

export type AdminLmsPolicyDefaults = {
  studentSessions?: number | null;
  teacherSessions?: number | null;
  managerSessions?: number | null;
  adminSessions?: number | null;
  sessionTtlSeconds?: number | null;
  sessionHeartbeatSeconds?: number | null;
  revokeOldestOnExceed?: boolean | null;
  downloadsAllowed?: boolean | null;
  watermarkEnabled?: boolean | null;
  mediaTtlSeconds?: number | null;
  sessionPolicyEnabled?: boolean | null;
  connectorEnabled?: boolean | null;
  connectorReadOnly?: boolean | null;
};

export function mergePolicyDefaults(
  envConfig: LmsConnectorConfig,
  admin?: AdminLmsPolicyDefaults | null,
) {
  return {
    studentSessions: admin?.studentSessions ?? envConfig.defaultStudentSessions,
    teacherSessions: admin?.teacherSessions ?? envConfig.defaultTeacherSessions,
    managerSessions: admin?.managerSessions ?? envConfig.defaultManagerSessions,
    adminSessions: admin?.adminSessions ?? envConfig.defaultAdminSessions,
    sessionTtlSeconds: admin?.sessionTtlSeconds ?? envConfig.sessionTtlSeconds,
    sessionHeartbeatSeconds:
      admin?.sessionHeartbeatSeconds ?? envConfig.sessionHeartbeatSeconds,
    revokeOldestOnExceed: admin?.revokeOldestOnExceed ?? true,
    downloadsAllowed: admin?.downloadsAllowed ?? false,
    watermarkEnabled: admin?.watermarkEnabled ?? true,
    mediaTtlSeconds: admin?.mediaTtlSeconds ?? 300,
    sessionPolicyEnabled: admin?.sessionPolicyEnabled ?? envConfig.sessionPolicyEnabled,
  };
}

export function resolveRolePolicy(
  role: LmsProfileRole,
  envConfig: LmsConnectorConfig,
  admin?: AdminLmsPolicyDefaults | null,
) {
  return resolveLmsPolicy({
    role,
    defaults: mergePolicyDefaults(envConfig, admin),
  });
}

/** Testes / hot-reload. */
export function resetLmsRuntimeForTests(): void {
  cachedRedis = undefined;
  cachedClient = null;
  cachedConfig = null;
  cachedSessions = null;
  cachedCache = null;
}
