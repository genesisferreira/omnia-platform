import {
  MediaAuthorizationService,
  SignedAccessService,
  createMemoryDecisionCache,
  createMemoryReplayProtection,
  createMemorySignedAccessStore,
  parsePurpose,
  requireCorrelationId,
  requireIdempotencyKey,
  validateMediaContext,
  type MediaDecision,
  type MediaPolicyInput,
  type SignedAccessToken,
} from '@omnia/media-authorization';
import type { LmsProfileRole } from '@omnia/shared/lms';
import {
  mediaAuthorizeDeniedTotal,
  mediaAuthorizeTotal,
  mediaCacheHitsTotal,
  mediaLatencySeconds,
  mediaRevokedTotal,
  mediaSignedTotal,
} from '@omnia/monitoring/metrics';
import type { PayloadRequest } from 'payload';

import { writeLmsAudit } from './identity';
import { loadAdminPolicyDefaults } from './read-api';
import { getRuntimeLmsConfig, resolveRolePolicy } from './runtime';

const moduleCache = createMemoryDecisionCache();
const moduleReplay = createMemoryReplayProtection();
const moduleSignedStore = createMemorySignedAccessStore();
const moduleSigned = new SignedAccessService(moduleSignedStore);
const decisionById = new Map<string, MediaDecision>();

function metricsPort() {
  return {
    incAuthorize(result: 'granted' | 'denied') {
      mediaAuthorizeTotal.inc({ result });
      if (result === 'denied') mediaAuthorizeDeniedTotal.inc();
    },
    incSigned() {
      mediaSignedTotal.inc();
    },
    incRevoked() {
      mediaRevokedTotal.inc();
    },
    incCacheHit() {
      mediaCacheHitsTotal.inc();
    },
    observeLatency(seconds: number) {
      mediaLatencySeconds.observe({}, seconds);
    },
  };
}

function auditPort(req: PayloadRequest) {
  return {
    async record(input: {
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
    }) {
      await writeLmsAudit(req, {
        action: input.action,
        actorId: input.actorId,
        targetUserId: input.actorId,
        reason: input.reason,
        newValue: {
          decision: input.decision,
          materialId: input.materialId,
          courseId: input.courseId,
          assetId: input.assetId,
        },
        metadata: {
          ...(input.metadata ?? {}),
          origin: input.origin,
          correlationId: input.correlationId,
          latencyMs: input.latencyMs,
        },
      });
    },
  };
}

function createAuthService(req: PayloadRequest): MediaAuthorizationService {
  return new MediaAuthorizationService({
    cache: moduleCache,
    replay: moduleReplay,
    metrics: metricsPort(),
    audit: auditPort(req),
    cacheTtlSeconds: 60,
  });
}

async function resolvePolicyInput(
  req: PayloadRequest,
  role: LmsProfileRole,
): Promise<MediaPolicyInput> {
  const config = getRuntimeLmsConfig();
  const admin = await loadAdminPolicyDefaults(req);
  const resolved = resolveRolePolicy(role, config, admin);
  return {
    downloadsAllowed: resolved.downloadsAllowed,
    watermarkEnabled: resolved.watermarkEnabled,
    mediaTtlSeconds: resolved.mediaTtlSeconds ?? 300,
  };
}

export async function authorizeMedia(
  req: PayloadRequest,
  input: {
    omniaUserId: string;
    role: LmsProfileRole;
    courseId: number;
    activityId?: number | null;
    materialId?: string | null;
    assetId: string;
    purpose?: unknown;
    sessionId?: string | null;
    origin?: 'omnia.web' | 'omnia.admin' | 'omnia.internal' | 'system';
    correlationId?: string | null;
    idempotencyKey?: string | null;
  },
): Promise<MediaDecision> {
  const purpose = parsePurpose(input.purpose);
  const correlationId = requireCorrelationId(input.correlationId);
  const context = {
    omniaUserId: input.omniaUserId,
    role: input.role,
    courseId: input.courseId,
    activityId: input.activityId,
    materialId: input.materialId,
    assetId: input.assetId,
    purpose,
    sessionId: input.sessionId,
    origin: input.origin ?? 'omnia.internal',
    correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
  };
  validateMediaContext(context);
  const policy = await resolvePolicyInput(req, input.role);
  const decision = await createAuthService(req).authorize({ context, policy });
  decisionById.set(decision.decisionId, decision);
  return decision;
}

export async function signMediaAccess(
  req: PayloadRequest,
  input: {
    decisionId: string;
    grantToken: string;
    assetId: string;
    omniaUserId: string;
    ttlSeconds?: number;
    correlationId?: string | null;
  },
): Promise<SignedAccessToken> {
  const decision = decisionById.get(input.decisionId);
  if (!decision || !decision.granted) {
    throw Object.assign(new Error('DECISION_NOT_FOUND'), {
      code: 'DECISION_NOT_FOUND',
      status: 404,
    });
  }
  const started = Date.now();
  const correlationId = requireCorrelationId(input.correlationId);
  const token = await moduleSigned.issue(
    {
      decisionId: input.decisionId,
      grantToken: input.grantToken,
      assetId: input.assetId,
      omniaUserId: input.omniaUserId,
      ttlSeconds: input.ttlSeconds,
      correlationId,
    },
    decision,
  );
  metricsPort().incSigned();
  await auditPort(req).record({
    action: 'media.sign',
    actorId: input.omniaUserId,
    assetId: input.assetId,
    origin: 'omnia.internal',
    decision: 'signed',
    reason: 'CONTROLLED_MOCK_TOKEN',
    latencyMs: Date.now() - started,
    correlationId,
    metadata: { tokenId: token.tokenId, mode: token.mode },
  });
  return token;
}

export async function revokeMediaAccess(
  req: PayloadRequest,
  input: {
    tokenId?: string;
    grantId?: string;
    assetId?: string;
    omniaUserId: string;
    correlationId?: string | null;
    reason?: string;
  },
): Promise<{ revoked: number }> {
  const started = Date.now();
  const correlationId = requireCorrelationId(input.correlationId);
  const result = await moduleSigned.revoke({
    tokenId: input.tokenId,
    grantId: input.grantId,
    assetId: input.assetId,
    omniaUserId: input.omniaUserId,
    correlationId,
    reason: input.reason,
  });
  if (result.revoked > 0) metricsPort().incRevoked();
  await auditPort(req).record({
    action: 'media.revoke',
    actorId: input.omniaUserId,
    assetId: input.assetId ?? null,
    origin: 'omnia.internal',
    decision: 'revoked',
    reason: input.reason ?? 'REVOKED',
    latencyMs: Date.now() - started,
    correlationId,
    metadata: { revoked: result.revoked, tokenId: input.tokenId, grantId: input.grantId },
  });
  return result;
}

export function resetMediaRuntimeForTests(): void {
  decisionById.clear();
}

export { requireIdempotencyKey };
