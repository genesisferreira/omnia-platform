export type LearningCacheOptions = {
  defaultTtlMs?: number;
  now?: () => number;
};

type CacheEntry<T> = { value: T; expiresAt: number };

/**
 * Cache in-memory do estado de aprendizagem (TTL).
 * Não substitui Connector cache; cobre agregações UX no client/server.
 */
export class LearningCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly now: () => number;

  constructor(options: LearningCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  invalidate(prefixOrKey: string): void {
    if (this.store.has(prefixOrKey)) {
      this.store.delete(prefixOrKey);
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefixOrKey)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
