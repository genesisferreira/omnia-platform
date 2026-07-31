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
}

export function recordSessionRevocation(): void {
  counters.sessionRevocations += 1;
}

export function recordCacheHit(): void {
  counters.cacheHits += 1;
}

export function recordCacheMiss(): void {
  counters.cacheMisses += 1;
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
