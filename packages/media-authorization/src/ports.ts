import type { MediaDecision, MediaSignCommand, MediaRevokeCommand, SignedAccessToken } from './types';

export type MediaAuditPort = {
  record(input: {
    action: string;
    actorId: string;
    materialId?: string | null;
    courseId?: number | null;
    assetId?: string | null;
    origin: string;
    decision: 'granted' | 'denied' | 'signed' | 'revoked';
    reason: string;
    latencyMs: number;
    correlationId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};

export type MediaMetricsPort = {
  incAuthorize(result: 'granted' | 'denied'): void;
  incSigned(): void;
  incRevoked(): void;
  incCacheHit(): void;
  observeLatency(seconds: number): void;
};

export type MediaDecisionCachePort = {
  get(key: string): Promise<MediaDecision | null>;
  set(key: string, decision: MediaDecision, ttlSeconds: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePrefix?(prefix: string): Promise<void>;
};

export type CryptoSignaturePort = {
  /** Interface preparada — implementação definitiva fora deste épico. */
  sign(payload: string): Promise<string>;
  verify(payload: string, signature: string): Promise<boolean>;
};

export type ReplayProtectionPort = {
  /** Interface preparada — nonce/jti denylist. */
  seen(jti: string): Promise<boolean>;
  mark(jti: string, ttlSeconds: number): Promise<void>;
};

export type SignedAccessStorePort = {
  save(token: SignedAccessToken): Promise<void>;
  get(tokenId: string): Promise<SignedAccessToken | null>;
  revoke(tokenId: string): Promise<SignedAccessToken | null>;
  revokeByGrant(grantId: string): Promise<number>;
};

export type SignedAccessIssuer = {
  issue(command: MediaSignCommand, decision: MediaDecision): Promise<SignedAccessToken>;
  renew(tokenId: string, ttlSeconds: number): Promise<SignedAccessToken | null>;
  revoke(command: MediaRevokeCommand): Promise<{ revoked: number }>;
};
