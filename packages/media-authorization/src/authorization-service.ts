import { decisionCacheKey, newDecisionId, newGrantToken } from './cache';
import type {
  MediaAuditPort,
  MediaDecisionCachePort,
  MediaMetricsPort,
  ReplayProtectionPort,
} from './ports';
import { MediaPolicyResolver } from './policy-resolver';
import type {
  MediaAuthorizeCommand,
  MediaDecision,
  MediaDecisionReason,
} from './types';

export type MediaAuthorizationServiceOptions = {
  policyResolver?: MediaPolicyResolver;
  cache?: MediaDecisionCachePort | null;
  audit?: MediaAuditPort | null;
  metrics?: MediaMetricsPort | null;
  replay?: ReplayProtectionPort | null;
  /** TTL do cache de decisões (default 60s). */
  cacheTtlSeconds?: number;
  now?: () => number;
};

/**
 * Serviço corporativo de autorização de mídia.
 * Sempre em controlledMode: decisões reais + auditoria; sem entrega DRM/CDN.
 */
export class MediaAuthorizationService {
  private readonly resolver: MediaPolicyResolver;
  private readonly cache: MediaDecisionCachePort | null;
  private readonly audit: MediaAuditPort | null;
  private readonly metrics: MediaMetricsPort | null;
  private readonly replay: ReplayProtectionPort | null;
  private readonly cacheTtlSeconds: number;
  private readonly now: () => number;

  constructor(options: MediaAuthorizationServiceOptions = {}) {
    this.resolver = options.policyResolver ?? new MediaPolicyResolver();
    this.cache = options.cache ?? null;
    this.audit = options.audit ?? null;
    this.metrics = options.metrics ?? null;
    this.replay = options.replay ?? null;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? 60;
    this.now = options.now ?? (() => Date.now());
  }

  async authorize(command: MediaAuthorizeCommand): Promise<MediaDecision> {
    const started = this.now();
    const { context, policy } = command;

    if (context.idempotencyKey && this.replay) {
      const jti = `auth:${context.idempotencyKey}`;
      if (await this.replay.seen(jti)) {
        const cachedKey = decisionCacheKey({
          omniaUserId: context.omniaUserId,
          assetId: context.assetId,
          purpose: context.purpose,
          courseId: context.courseId,
        });
        const prior = this.cache ? await this.cache.get(cachedKey) : null;
        if (prior) {
          this.metrics?.incCacheHit();
          return Object.freeze({ ...prior, cached: true, latencyMs: this.now() - started });
        }
      }
      await this.replay.mark(jti, 300);
    }

    const cacheKey = decisionCacheKey({
      omniaUserId: context.omniaUserId,
      assetId: context.assetId,
      purpose: context.purpose,
      courseId: context.courseId,
    });

    if (this.cache) {
      const hit = await this.cache.get(cacheKey);
      if (hit && new Date(hit.expiresAt).getTime() > this.now()) {
        this.metrics?.incCacheHit();
        const cached = Object.freeze({
          ...hit,
          cached: true,
          latencyMs: this.now() - started,
        });
        this.metrics?.observeLatency(cached.latencyMs / 1000);
        return cached;
      }
    }

    const resolved = this.resolver.resolve(context, policy);
    const latencyMs = this.now() - started;
    const granted = !resolved.denyReason;
    const reason: MediaDecisionReason = resolved.denyReason ?? 'GRANTED_CONTROLLED_MODE';
    const expiresAt = new Date(this.now() + resolved.ttlSeconds * 1000).toISOString();

    const decision: MediaDecision = Object.freeze({
      decisionId: newDecisionId(),
      granted,
      capabilities: resolved.capabilities,
      expiresAt,
      reason,
      origin: context.origin,
      correlationId: context.correlationId,
      assetId: context.assetId,
      omniaUserId: context.omniaUserId,
      courseId: context.courseId,
      purpose: context.purpose,
      policySource: resolved.policySource,
      watermarkRequired: resolved.watermarkRequired,
      controlledMode: true as const,
      latencyMs,
      cached: false,
      grantToken: granted ? newGrantToken() : null,
    });

    if (this.cache && granted) {
      await this.cache.set(cacheKey, decision, Math.min(this.cacheTtlSeconds, resolved.ttlSeconds));
    }

    this.metrics?.incAuthorize(granted ? 'granted' : 'denied');
    this.metrics?.observeLatency(latencyMs / 1000);

    await this.audit?.record({
      action: 'media.authorize',
      actorId: context.omniaUserId,
      materialId: context.materialId ?? null,
      courseId: context.courseId,
      assetId: context.assetId,
      origin: context.origin,
      decision: granted ? 'granted' : 'denied',
      reason,
      latencyMs,
      correlationId: context.correlationId,
      metadata: {
        purpose: context.purpose,
        role: context.role,
        capabilities: decision.capabilities,
        controlledMode: true,
      },
    });

    return decision;
  }
}
