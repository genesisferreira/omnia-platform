import { loadApplicationConfig } from './application/index';
import { loadDatabaseConfig } from './database/index';
import { parseEnvironment, type AppEnvironment } from './environment/index';
import { loadPayloadConfig } from './payload/index';
import { loadStorageConfig } from './storage/index';

export type OmniaConfig = {
  env: AppEnvironment;
  app: ReturnType<typeof loadApplicationConfig>;
  database: ReturnType<typeof loadDatabaseConfig>;
  storage: ReturnType<typeof loadStorageConfig>;
  payload: ReturnType<typeof loadPayloadConfig>;
};

let cachedConfig: OmniaConfig | null = null;

export function loadConfig(env: Record<string, string | undefined> = process.env): OmniaConfig {
  return {
    env: parseEnvironment(env.NODE_ENV),
    app: loadApplicationConfig(env),
    database: loadDatabaseConfig(env),
    storage: loadStorageConfig(env),
    payload: loadPayloadConfig(env),
  };
}

/** Singleton — use em runtime server-side */
export function getConfig(): OmniaConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export { parseEnvironment, type AppEnvironment } from './environment/index';
export { loadApplicationConfig, type ApplicationConfig } from './application/index';
export { loadDatabaseConfig, type DatabaseConfig } from './database/index';
export { loadStorageConfig, getMinioEndpoint, type StorageConfig } from './storage/index';
export { loadPayloadConfig, type PayloadConfig } from './payload/index';
