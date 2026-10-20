import { createHash, randomUUID } from 'node:crypto';

import type { MediaDecisionCachePort } from './ports';
import type { MediaDecision } from './types';

/** Cache em memória — preparado para Redis via porta. */
export function createMemoryDecisionCache(): MediaDecisionCachePort {
  const store = new Map<string, { decision: MediaDecision; expiresAt: number }>();
  return {
    async get(key) {
      const hit = store.get(key);
      if (!hit) return null;
      if (Date.now() > hit.expiresAt) {
        store.delete(key);
        return null;
      }
      return hit.decision;
    },
    async set(key, decision, ttlSeconds) {
      store.set(key, {
        decision,
        expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
      });
    },
    async invalidate(key) {
      store.delete(key);
    },
    async invalidatePrefix(prefix) {
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) store.delete(k);
      }
    },
  };
}

export function decisionCacheKey(input: {
  omniaUserId: string;
  assetId: string;
  purpose: string;
  courseId: number;
}): string {
  const raw = `${input.omniaUserId}|${input.assetId}|${input.purpose}|${input.courseId}`;
  return `media:decision:${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
}

export function newDecisionId(): string {
  return randomUUID();
}

export function newGrantToken(): string {
  return `mgr_${randomUUID().replace(/-/g, '')}`;
}
