import { recordCacheHit, recordCacheMiss, recordRedisOp } from '../observability/metrics';
import type { RedisLike } from '../session/session-manager';

export type LmsCacheTtl = {
  siteInfoSeconds: number;
  coursesCatalogSeconds: number;
  courseContentsSeconds: number;
  categoriesSeconds: number;
};

export const DEFAULT_LMS_CACHE_TTL: LmsCacheTtl = {
  siteInfoSeconds: 300,
  coursesCatalogSeconds: 120,
  courseContentsSeconds: 120,
  categoriesSeconds: 300,
};

export function lmsCacheNamespace(appEnv: string): string {
  return `omnia:lms:cache:${appEnv}`;
}

/**
 * Cache seletivo de leituras estáveis.
 * Não cachear notas, progresso, completion ou sessões.
 */
export class LmsCache {
  constructor(
    private readonly redis: RedisLike | null,
    private readonly ns: string,
    private readonly memory = new Map<string, { value: string; expiresAt: number }>(),
  ) {}

  key(parts: string[]): string {
    return `${this.ns}:${parts.join(':')}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.getRaw(key);
    if (raw == null) {
      recordCacheMiss();
      return null;
    }
    recordCacheHit();
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, raw, 'EX', ttlSeconds);
      return;
    }
    this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async invalidate(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async ping(): Promise<boolean> {
    if (this.redis) {
      try {
        const pong = await this.redis.ping();
        return pong === 'PONG' || pong === 'pong';
      } catch {
        return false;
      }
    }
    return true;
  }

  private async getRaw(key: string): Promise<string | null> {
    if (this.redis) {
      const started = Date.now();
      try {
        const value = await this.redis.get(key);
        recordRedisOp('get', Date.now() - started, true);
        return value;
      } catch (err) {
        recordRedisOp('get', Date.now() - started, false);
        throw err;
      }
    }
    const hit = this.memory.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return hit.value;
  }
}
