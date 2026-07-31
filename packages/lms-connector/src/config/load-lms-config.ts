/**
 * Configuração tipada do Omnia LMS Connector.
 * Token Moodle somente no backend — nunca NEXT_PUBLIC_*.
 */

export type LmsConnectorConfig = {
  moodleBaseUrl: string;
  moodleInternalUrl: string;
  moodleRestToken: string;
  moodleServiceName: string;
  moodleRequestTimeoutMs: number;
  connectorEnabled: boolean;
  connectorReadOnly: boolean;
  /** Provisionamento acadêmico habilitado (fila/audit). Execute real ainda bloqueado. */
  provisionEnabled: boolean;
  /**
   * Dry-run de writes Moodle. Default true.
   * Sprint 3.0: runtime força dry-run mesmo se false (EXECUTE_DISABLED_UNTIL_ACTIVATION).
   */
  provisionDryRun: boolean;
  /**
   * Se true, permite callWrite com dryRun=false (HTTP write).
   * Bloqueado até ativação explícita do épico seguinte.
   */
  provisionExecuteEnabled: boolean;
  sessionPolicyEnabled: boolean;
  defaultStudentSessions: number;
  defaultTeacherSessions: number;
  defaultManagerSessions: number;
  defaultAdminSessions: number;
  sessionTtlSeconds: number;
  sessionHeartbeatSeconds: number;
  redisUrl: string | null;
  appEnv: string;
};

export type LmsConfigIssue = {
  code: string;
  message: string;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === '') {
    return fallback;
  }
  const v = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(v)) return true;
  if (FALSE_VALUES.has(v)) return false;
  return fallback;
}

function parsePositiveInt(raw: string | undefined, fallback: number, min = 1, max = 100): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(max, n);
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

function isProductionLike(env: string): boolean {
  return env === 'production' || env === 'prod';
}

/**
 * Carrega config LMS a partir do ambiente.
 * Em produção: exige configuração completa quando o connector está habilitado.
 * Em DEV: permite desabilitar explicitamente.
 */
export function loadLmsConnectorConfig(
  env: Record<string, string | undefined> = process.env,
): { config: LmsConnectorConfig; issues: LmsConfigIssue[] } {
  const appEnv = (
    env.APP_ENV ||
    env.OMNIA_ENV ||
    env.NODE_ENV ||
    'development'
  ).toLowerCase();
  const issues: LmsConfigIssue[] = [];

  const connectorEnabled = parseBool(env.MOODLE_CONNECTOR_ENABLED, false);
  const connectorReadOnly = parseBool(env.MOODLE_CONNECTOR_READ_ONLY, true);
  const provisionEnabled = parseBool(env.MOODLE_PROVISION_ENABLED, true);
  const provisionDryRun = parseBool(env.MOODLE_PROVISION_DRY_RUN, true);
  // MOODLE_PROVISION_EXECUTE — bloqueado até ativação; default false
  const provisionExecuteEnabled = parseBool(env.MOODLE_PROVISION_EXECUTE, false);
  const sessionPolicyEnabled = parseBool(env.LMS_SESSION_POLICY_ENABLED, true);

  const moodleBaseUrl = normalizeBaseUrl(env.MOODLE_BASE_URL || '');
  const moodleInternalUrl = normalizeBaseUrl(
    env.MOODLE_INTERNAL_URL || env.MOODLE_BASE_URL || '',
  );
  const moodleRestToken = (env.MOODLE_REST_TOKEN || '').trim();
  const moodleServiceName = (env.MOODLE_SERVICE_NAME || 'omnia_lms_readonly').trim();
  const moodleRequestTimeoutMs = parsePositiveInt(
    env.MOODLE_REQUEST_TIMEOUT_MS,
    10_000,
    500,
    60_000,
  );

  if (connectorEnabled) {
    if (!moodleBaseUrl) {
      issues.push({
        code: 'MOODLE_BASE_URL_MISSING',
        message: 'MOODLE_BASE_URL is required when MOODLE_CONNECTOR_ENABLED=true',
      });
    } else if (!/^https?:\/\//i.test(moodleBaseUrl)) {
      issues.push({
        code: 'MOODLE_BASE_URL_INVALID',
        message: 'MOODLE_BASE_URL must be an absolute http(s) URL',
      });
    }

    if (isProductionLike(appEnv)) {
      if (moodleBaseUrl.includes('localhost') || moodleBaseUrl.includes('127.0.0.1')) {
        issues.push({
          code: 'MOODLE_BASE_URL_LOCALHOST_IN_PROD',
          message: 'MOODLE_BASE_URL must not point to localhost in production',
        });
      }
      if (!moodleRestToken) {
        issues.push({
          code: 'MOODLE_REST_TOKEN_MISSING',
          message: 'MOODLE_REST_TOKEN is required when connector is enabled in production',
        });
      }
    } else if (!moodleRestToken) {
      issues.push({
        code: 'MOODLE_REST_TOKEN_MISSING',
        message: 'MOODLE_REST_TOKEN is required when MOODLE_CONNECTOR_ENABLED=true',
      });
    }
  }

  const config: LmsConnectorConfig = {
    moodleBaseUrl,
    moodleInternalUrl: moodleInternalUrl || moodleBaseUrl,
    moodleRestToken,
    moodleServiceName,
    moodleRequestTimeoutMs,
    connectorEnabled,
    connectorReadOnly,
    provisionEnabled,
    provisionDryRun,
    provisionExecuteEnabled,
    sessionPolicyEnabled,
    defaultStudentSessions: parsePositiveInt(env.LMS_DEFAULT_STUDENT_SESSIONS, 1, 1, 10),
    defaultTeacherSessions: parsePositiveInt(env.LMS_DEFAULT_TEACHER_SESSIONS, 2, 1, 10),
    defaultManagerSessions: parsePositiveInt(env.LMS_DEFAULT_MANAGER_SESSIONS, 2, 1, 10),
    defaultAdminSessions: parsePositiveInt(env.LMS_DEFAULT_ADMIN_SESSIONS, 2, 1, 10),
    sessionTtlSeconds: parsePositiveInt(env.LMS_SESSION_TTL_SECONDS, 28_800, 60, 604_800),
    sessionHeartbeatSeconds: parsePositiveInt(env.LMS_SESSION_HEARTBEAT_SECONDS, 60, 15, 3600),
    redisUrl: env.REDIS_URL?.trim() || null,
    appEnv,
  };

  return { config, issues };
}

/** Lança erro sanitizado se issues críticas existirem e connector estiver enabled. */
export function assertLmsConfigUsable(
  config: LmsConnectorConfig,
  issues: LmsConfigIssue[],
): void {
  if (!config.connectorEnabled) {
    return;
  }
  const blocking = issues.filter((i) =>
    [
      'MOODLE_BASE_URL_MISSING',
      'MOODLE_BASE_URL_INVALID',
      'MOODLE_BASE_URL_LOCALHOST_IN_PROD',
      'MOODLE_REST_TOKEN_MISSING',
    ].includes(i.code),
  );
  if (blocking.length > 0) {
    throw new Error(
      `LMS connector misconfigured: ${blocking.map((b) => b.code).join(', ')}`,
    );
  }
}

/** Redige token para logs — nunca retorna o valor real. */
export function redactToken(token: string | null | undefined): string {
  if (!token) return '[empty]';
  if (token.length <= 8) return '[redacted]';
  return `${token.slice(0, 4)}…[redacted]`;
}
