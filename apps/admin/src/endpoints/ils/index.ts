import type { Endpoint, PayloadRequest } from 'payload';

import { requireLmsAuth } from '../../services/lms/auth-context';
import { AcademicError } from '../../services/academic/engine';
import {
  adminOverview,
  assessmentAnswer,
  assessmentNext,
  classIntelligence,
  createExerciseDraft,
  createIntervention,
  exemptOnboarding,
  getOnboarding,
  ilsContext,
  recordConsent,
  saveBlueprint,
  saveGoals,
  savePcar,
  startOnboarding,
  student360,
  validateExercise,
} from '../../services/ils/engine';
import { isSchoolKey } from '@omnia/intelligent-learning';

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function ok(body: unknown, status = 200) {
  return json(status, {
    ok: true,
    ...(body && typeof body === 'object' ? (body as object) : { data: body }),
  });
}

function fail(err: unknown): Response {
  if (err instanceof AcademicError) {
    return json(err.status, { ok: false, error: { code: err.code, message: err.message } });
  }
  if (err instanceof Error && err.message === 'OVERRIDE_REASON_REQUIRED') {
    return json(400, {
      ok: false,
      error: { code: 'OVERRIDE_REASON_REQUIRED', message: err.message },
    });
  }
  const message = err instanceof Error ? err.message : 'Erro ILS';
  return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message } });
}

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  const raw = (await req.json?.().catch(() => null)) as unknown;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export const ilsEndpoints: Endpoint[] = [
  {
    path: '/omnia/academic/ils/context',
    method: 'get',
    handler: async (req) => {
      try {
        return ok({ context: await ilsContext(req.payload, requireLmsAuth(req)) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding',
    method: 'get',
    handler: async (req) => {
      try {
        return ok({ onboarding: await getOnboarding(req.payload, requireLmsAuth(req)) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/start',
    method: 'post',
    handler: async (req) => {
      try {
        return ok({ onboarding: await startOnboarding(req.payload, requireLmsAuth(req)) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/consent',
    method: 'post',
    handler: async (req) => {
      try {
        return ok({ onboarding: await recordConsent(req.payload, requireLmsAuth(req)) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/pcar',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        return ok({ onboarding: await savePcar(req.payload, requireLmsAuth(req), b) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/goals',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        return ok({ onboarding: await saveGoals(req.payload, requireLmsAuth(req), b) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/assessment',
    method: 'get',
    handler: async (req) => {
      try {
        return ok(await assessmentNext(req.payload, requireLmsAuth(req)));
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/onboarding/assessment/answer',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        return ok(
          await assessmentAnswer(req.payload, requireLmsAuth(req), {
            questionId: String(b.questionId || ''),
            value: b.value,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/student-360',
    method: 'get',
    handler: async (req) => {
      try {
        const auth = requireLmsAuth(req);
        const q = req.searchParams?.get?.('studentId');
        const sid = num(q) ?? Number(auth.omniaUserId);
        return ok({ profile: await student360(req.payload, auth, sid) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/teaching/student/:id',
    method: 'get',
    handler: async (req) => {
      try {
        const id = num(req.routeParams?.id);
        if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
        return ok({ profile: await student360(req.payload, requireLmsAuth(req), id) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/teaching/class-intel/:id',
    method: 'get',
    handler: async (req) => {
      try {
        const id = num(req.routeParams?.id);
        if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
        return ok({ intel: await classIntelligence(req.payload, requireLmsAuth(req), id) });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/teaching/interventions',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        const studentId = num(b.studentId);
        if (!studentId)
          return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'studentId' } });
        return ok(
          await createIntervention(req.payload, requireLmsAuth(req), {
            studentId,
            courseId: num(b.courseId),
            classId: num(b.classId),
            action: String(b.action || 'observation'),
            reason: String(b.reason || ''),
            suggestedByAi: b.suggestedByAi === true,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/admin/overview',
    method: 'get',
    handler: async (req) => {
      try {
        const raw = req.searchParams?.get?.('schoolKey');
        return ok({
          overview: await adminOverview(
            req.payload,
            requireLmsAuth(req),
            isSchoolKey(raw) ? raw : null,
          ),
        });
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/exercises',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        return ok(
          await createExerciseDraft(req.payload, requireLmsAuth(req), {
            prompt: String(b.prompt || ''),
            type: typeof b.type === 'string' ? b.type : undefined,
            competencyKey: String(b.competencyKey || 'fundamentos'),
            difficulty: typeof b.difficulty === 'string' ? b.difficulty : undefined,
            expectedAnswer: typeof b.expectedAnswer === 'string' ? b.expectedAnswer : undefined,
            studentId: num(b.studentId) ?? undefined,
            courseId: num(b.courseId) ?? undefined,
            lessonId: num(b.lessonId) ?? undefined,
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/exercises/:id/validate',
    method: 'post',
    handler: async (req) => {
      try {
        const id = num(req.routeParams?.id);
        if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
        const b = await readBody(req);
        const action = b.action === 'publish' || b.action === 'reject' ? b.action : 'validate';
        return ok(await validateExercise(req.payload, requireLmsAuth(req), id, action));
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/blueprints',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        return ok(
          await saveBlueprint(req.payload, requireLmsAuth(req), {
            title: String(b.title || 'Blueprint'),
            version: String(b.version || 'v1'),
            competencies: Array.isArray(b.competencies) ? (b.competencies as never) : [],
            difficulty: (b.difficulty as never) || { beginner: 40, intermediate: 40, advanced: 20 },
            questionCount: num(b.questionCount) || 10,
            timeLimitMinutes: num(b.timeLimitMinutes) || 40,
            passingScore: num(b.passingScore) || 70,
            allowedTypes: Array.isArray(b.allowedTypes)
              ? (b.allowedTypes as string[])
              : ['multiple_choice', 'true_false'],
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  },
  {
    path: '/omnia/academic/ils/override',
    method: 'post',
    handler: async (req) => {
      try {
        const b = await readBody(req);
        const studentId = num(b.studentId);
        if (!studentId)
          return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'studentId' } });
        return ok(await exemptOnboarding(req.payload, requireLmsAuth(req), studentId, b.reason));
      } catch (err) {
        return fail(err);
      }
    },
  },
];
