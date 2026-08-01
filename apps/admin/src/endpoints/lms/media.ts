import type { Endpoint, PayloadRequest } from 'payload';
import { checkRateLimit } from '@omnia/shared/rate-limit';
import { requireIdempotencyKey } from '@omnia/media-authorization';

import { resolveLmsAuth } from '../../services/lms/auth-context';
import {
  authorizeMedia,
  revokeMediaAccess,
  signMediaAccess,
} from '../../services/lms/media-authorization';
import { withLmsObservability } from '../../services/lms/observability';
import { jsonError, jsonOk } from '../../services/lms/read-api';

async function applyMediaRateLimit(subject: string): Promise<Response | null> {
  const decision = await checkRateLimit({
    scope: 'lms:media',
    subjects: [{ value: subject }],
    max: 60,
    windowMs: 60_000,
    onRedisUnavailable: 'memory-fallback',
  });
  if (!decision.allowed) {
    return Response.json(
      { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(decision.retryAfterSeconds ?? 60),
        },
      },
    );
  }
  return null;
}

/**
 * Auth S2S: internal key + user id.
 * Student/teacher podem autorizar própria mídia; revoke/sign exigem admin|manager|self.
 */
function requireInternalMediaAuth(req: PayloadRequest) {
  const ctx = resolveLmsAuth(req);
  if (!ctx || ctx.via !== 'internal') {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return ctx;
}

function correlationFrom(req: PayloadRequest): string {
  return (
    req.headers.get('x-correlation-id')?.trim() ||
    req.headers.get('x-request-id')?.trim() ||
    `corr_${Date.now().toString(36)}`
  );
}

async function readJsonBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  if (!req.json) return {};
  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}

export const lmsMediaAuthorizeEndpoint: Endpoint = {
  path: '/omnia/lms/internal/media/authorize',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/media/authorize', async () => {
      try {
        const auth = requireInternalMediaAuth(req);
        const limited = await applyMediaRateLimit(auth.omniaUserId);
        if (limited) return limited;
        const idempotencyKey = requireIdempotencyKey(
          req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key'),
        );
        const body = await readJsonBody(req);
        const decision = await authorizeMedia(req, {
          omniaUserId: String(body.omniaUserId || auth.omniaUserId),
          role: auth.role,
          courseId: Number(body.courseId),
          activityId: body.activityId != null ? Number(body.activityId) : null,
          materialId: body.materialId != null ? String(body.materialId) : null,
          assetId: String(body.assetId || ''),
          purpose: body.purpose,
          sessionId: body.sessionId != null ? String(body.sessionId) : null,
          origin: 'omnia.internal',
          correlationId: correlationFrom(req),
          idempotencyKey,
        });
        return jsonOk({ ok: true, decision });
      } catch (err) {
        if (err instanceof Error && err.message === 'IDEMPOTENCY_KEY_REQUIRED') {
          return Response.json(
            {
              ok: false,
              error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: err.message },
            },
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        return jsonError(err);
      }
    }),
};

export const lmsMediaSignEndpoint: Endpoint = {
  path: '/omnia/lms/internal/media/sign',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/media/sign', async () => {
      try {
        const auth = requireInternalMediaAuth(req);
        const limited = await applyMediaRateLimit(auth.omniaUserId);
        if (limited) return limited;
        const body = await readJsonBody(req);
        const token = await signMediaAccess(req, {
          decisionId: String(body.decisionId || ''),
          grantToken: String(body.grantToken || ''),
          assetId: String(body.assetId || ''),
          omniaUserId: auth.omniaUserId,
          ttlSeconds: body.ttlSeconds != null ? Number(body.ttlSeconds) : undefined,
          correlationId: correlationFrom(req),
        });
        return jsonOk({ ok: true, token });
      } catch (err) {
        if (err instanceof Error && (err as { code?: string }).code === 'DECISION_NOT_FOUND') {
          return Response.json(
            { ok: false, error: { code: 'DECISION_NOT_FOUND', message: 'Decision not found' } },
            { status: 404, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        return jsonError(err);
      }
    }),
};

export const lmsMediaRevokeEndpoint: Endpoint = {
  path: '/omnia/lms/internal/media/revoke',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/media/revoke', async () => {
      try {
        const auth = requireInternalMediaAuth(req);
        if (auth.role !== 'admin' && auth.role !== 'manager') {
          const err = new Error('FORBIDDEN');
          (err as Error & { status: number }).status = 403;
          throw err;
        }
        const limited = await applyMediaRateLimit(auth.omniaUserId);
        if (limited) return limited;
        const body = await readJsonBody(req);
        const result = await revokeMediaAccess(req, {
          tokenId: body.tokenId != null ? String(body.tokenId) : undefined,
          grantId: body.grantId != null ? String(body.grantId) : undefined,
          assetId: body.assetId != null ? String(body.assetId) : undefined,
          omniaUserId: auth.omniaUserId,
          correlationId: correlationFrom(req),
          reason: body.reason != null ? String(body.reason) : undefined,
        });
        return jsonOk({ ok: true, ...result });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsMediaEndpoints: Endpoint[] = [
  lmsMediaAuthorizeEndpoint,
  lmsMediaSignEndpoint,
  lmsMediaRevokeEndpoint,
];
