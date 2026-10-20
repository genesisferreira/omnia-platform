/** Cache TTL in-memory para snapshots de assessment. */
export class AssessmentCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly defaultTtlMs: number;
  private readonly now: () => number;

  constructor(options?: { defaultTtlMs?: number; now?: () => number }) {
    this.defaultTtlMs = options?.defaultTtlMs ?? 30_000;
    this.now = options?.now ?? (() => Date.now());
  }

  get<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set(key: string, value: unknown, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
