import type { Endpoint, PayloadRequest } from 'payload';
import { checkRateLimit } from '@omnia/shared/rate-limit';
import { requireIdempotencyKey } from '@omnia/academic-provisioning';

import { resolveLmsAuth } from '../../services/lms/auth-context';
import { withLmsObservability } from '../../services/lms/observability';
import { jsonError, jsonOk } from '../../services/lms/read-api';
import {
  getProvisionJob,
  handleProvisionEnrollment,
  handleProvisionUser,
  listProvisionCapabilities,
  tickProvisionWorker,
  getProvisionRuntime,
} from '../../services/lms/provisioning';

async function applyProvisionRateLimit(subject: string): Promise<Response | null> {
  const decision = await checkRateLimit({
    scope: 'lms:provision',
    subjects: [{ value: subject }],
    max: 30,
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
 * Auth S2S only: x-omnia-internal-key + x-omnia-user-id + role admin|manager.
 * Recusa sessão browser/Payload cookie.
 */
function requireInternalProvisionAuth(req: PayloadRequest) {
  const ctx = resolveLmsAuth(req);
  if (!ctx || ctx.via !== 'internal') {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (ctx.role !== 'admin' && ctx.role !== 'manager') {
    const err = new Error('FORBIDDEN');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return ctx;
}

function readIdempotencyKey(req: PayloadRequest): string {
  return requireIdempotencyKey(
    req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key'),
  );
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

export const lmsProvisionUsersEndpoint: Endpoint = {
  path: '/omnia/lms/internal/provision/users',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/provision/users', async () => {
      try {
        const auth = requireInternalProvisionAuth(req);
        const limited = await applyProvisionRateLimit(auth.omniaUserId);
        if (limited) return limited;

        const idempotencyKey = readIdempotencyKey(req);
        const body = await readJsonBody(req);
        const action = String(body.action || 'create') as
          'create' | 'update' | 'disable' | 'enable' | 'sync';

        const result = await handleProvisionUser(req, {
          action,
          omniaUserId: String(body.omniaUserId || ''),
          username: body.username != null ? String(body.username) : undefined,
          email: body.email != null ? String(body.email) : undefined,
          firstName: body.firstName != null ? String(body.firstName) : undefined,
          lastName: body.lastName != null ? String(body.lastName) : undefined,
          moodleUserId: body.moodleUserId != null ? Number(body.moodleUserId) : undefined,
          idempotencyKey,
          correlationId: correlationFrom(req),
          actor: {
            omniaUserId: auth.omniaUserId,
            role: auth.role,
            origin: 'omnia.internal',
          },
        });

        if (body.defer === true && result.jobId) {
          const runtime = await getProvisionRuntime(req);
          await runtime.queue.schedule(result.jobId);
        }

        return jsonOk({ ok: result.ok, result });
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

export const lmsProvisionEnrollmentsEndpoint: Endpoint = {
  path: '/omnia/lms/internal/provision/enrollments',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/provision/enrollments', async () => {
      try {
        const auth = requireInternalProvisionAuth(req);
        const limited = await applyProvisionRateLimit(auth.omniaUserId);
        if (limited) return limited;

        const idempotencyKey = readIdempotencyKey(req);
        const body = await readJsonBody(req);
        const action = String(body.action || 'enroll') as
          'enroll' | 'unenroll' | 'suspend' | 'reactivate' | 'sync';

        const result = await handleProvisionEnrollment(req, {
          action,
          omniaUserId: String(body.omniaUserId || ''),
          moodleUserId: body.moodleUserId != null ? Number(body.moodleUserId) : undefined,
          moodleCourseId: Number(body.moodleCourseId),
          roleId: body.roleId != null ? Number(body.roleId) : undefined,
          idempotencyKey,
          correlationId: correlationFrom(req),
          actor: {
            omniaUserId: auth.omniaUserId,
            role: auth.role,
            origin: 'omnia.internal',
          },
        });

        return jsonOk({ ok: result.ok, result });
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

export const lmsProvisionJobEndpoint: Endpoint = {
  path: '/omnia/lms/internal/provision/jobs/:id',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/provision/jobs/:id', async () => {
      try {
        requireInternalProvisionAuth(req);
        const id = req.routeParams?.id;
        if (!id || typeof id !== 'string') {
          return Response.json(
            { ok: false, error: { code: 'JOB_ID_REQUIRED', message: 'Job id required' } },
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        const job = await getProvisionJob(req, id);
        if (!job) {
          return Response.json(
            { ok: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
            { status: 404, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        return jsonOk({ ok: true, job });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsProvisionCapabilitiesEndpoint: Endpoint = {
  path: '/omnia/lms/internal/provision/capabilities',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/provision/capabilities', async () => {
      try {
        requireInternalProvisionAuth(req);
        const caps = await listProvisionCapabilities(req);
        return jsonOk({ ok: true, ...caps });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsProvisionWorkerTickEndpoint: Endpoint = {
  path: '/omnia/lms/internal/provision/worker/tick',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/internal/provision/worker/tick', async () => {
      try {
        const auth = requireInternalProvisionAuth(req);
        const limited = await applyProvisionRateLimit(auth.omniaUserId);
        if (limited) return limited;
        const body = await readJsonBody(req);
        const maxJobs = Math.min(50, Math.max(1, Number(body.maxJobs) || 5));
        const tick = await tickProvisionWorker(req, maxJobs);
        return jsonOk({ ok: true, ...tick });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsProvisionEndpoints: Endpoint[] = [
  lmsProvisionUsersEndpoint,
  lmsProvisionEnrollmentsEndpoint,
  lmsProvisionJobEndpoint,
  lmsProvisionCapabilitiesEndpoint,
  lmsProvisionWorkerTickEndpoint,
];
