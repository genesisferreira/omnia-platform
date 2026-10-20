import { loadApplicationConfig } from './application/index';
import { loadDatabaseConfig } from './database/index';
import { parseEnvironment, requiresStrictSecrets, type AppEnvironment } from './environment/index';
import { loadPayloadConfig } from './payload/index';
import { loadStorageConfig } from './storage/index';

export type OmniaConfig = {
  env: AppEnvironment;
  app: ReturnType<typeof loadApplicationConfig>;
  database: ReturnType<typeof loadDatabaseConfig>;
  storage: ReturnType<typeof loadStorageConfig>;
  payload: ReturnType<typeof loadPayloadConfig>;
};

/** Configuração server-only Portal → Admin. Nunca incluir em OmniaConfig / frontend. */
export type InternalApiConfig = {
  secret: string;
};

const INTERNAL_API_SECRET_MIN_LENGTH = 32;

let cachedConfig: OmniaConfig | null = null;
let cachedInternalApiConfig: InternalApiConfig | null = null;

export function loadConfig(env: Record<string, string | undefined> = process.env): OmniaConfig {
  return {
    env: parseEnvironment(env.NODE_ENV),
    app: loadApplicationConfig(env),
    database: loadDatabaseConfig(env),
    storage: loadStorageConfig(env),
    payload: loadPayloadConfig(env),
  };
}

/** Singleton — use em runtime server-side (sem secrets S2S). */
export function getConfig(): OmniaConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Carrega OMNIA_INTERNAL_API_SECRET (server-only).
 * Sem fallback inseguro; não registra o valor em logs.
 */
export function loadInternalApiConfig(
  env: Record<string, string | undefined> = process.env,
): InternalApiConfig {
  const appEnv = parseEnvironment(env.NODE_ENV);
  const raw = env.OMNIA_INTERNAL_API_SECRET;
  const secret = typeof raw === 'string' ? raw.trim() : '';

  if (!secret) {
    if (requiresStrictSecrets(appEnv)) {
      throw new Error(
        `OMNIA_INTERNAL_API_SECRET is required when NODE_ENV is "${appEnv}". ` +
          'Use a server-only secret (min 32 characters) for Portal → Admin communication. ' +
          'Never use NEXT_PUBLIC_ or PAYLOAD_SECRET.',
      );
    }

    // development: getConfig() segue funcionando; só falha quando o S2S é solicitado
    throw new Error(
      'OMNIA_INTERNAL_API_SECRET is not set. ' +
        'Define a server-only secret (min 32 characters) for Portal → Admin communication. ' +
        'Never expose it with NEXT_PUBLIC_ or reuse PAYLOAD_SECRET.',
    );
  }

  if (secret.length < INTERNAL_API_SECRET_MIN_LENGTH) {
    throw new Error(
      `OMNIA_INTERNAL_API_SECRET must be at least ${INTERNAL_API_SECRET_MIN_LENGTH} characters.`,
    );
  }

  return { secret };
}

/**
 * Singleton server-only para autenticação interna Portal → Admin.
 * Não misturar com getConfig(); não serializar para o browser.
 */
export function getInternalApiConfig(): InternalApiConfig {
  if (!cachedInternalApiConfig) {
    cachedInternalApiConfig = loadInternalApiConfig();
  }
  return cachedInternalApiConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
  cachedInternalApiConfig = null;
}

export {
  isDevelopment,
  isProduction,
  isStaging,
  parseEnvironment,
  requiresStrictSecrets,
  type AppEnvironment,
} from './environment/index';
export { loadApplicationConfig, type ApplicationConfig } from './application/index';
export { loadDatabaseConfig, type DatabaseConfig } from './database/index';
export { loadStorageConfig, getMinioEndpoint, type StorageConfig } from './storage/index';
export { loadPayloadConfig, type PayloadConfig } from './payload/index';
