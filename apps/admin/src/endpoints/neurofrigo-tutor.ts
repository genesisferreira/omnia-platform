import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
import { runTutorAsk } from '../services/tutor/ask';
import { refreshTutorDashboard } from '../services/tutor/dashboard';
import { syncStudentProfile, syncLearningProfile } from '../services/tutor/profiles';
import { loadCourseCatalog } from '../services/tutor/catalog';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function authorize(req: PayloadRequest): { ok: true; userId?: string; role?: string } | Response {
  const secret = process.env.OMNIA_INTERNAL_API_SECRET;
  const key = req.headers.get('x-omnia-internal-key') || req.headers.get('x-omnia-internal-secret');
  if (secret && key && key === secret) {
    return {
      ok: true,
      userId: req.headers.get('x-omnia-user-id') || undefined,
      role: req.headers.get('x-omnia-lms-role') || 'student',
    };
  }
  if (req.user) {
    return {
      ok: true,
      userId: String(req.user.id),
      role: String((req.user as { role?: string }).role || 'student'),
    };
  }
  if (isKiStaff(req.user as { role?: unknown } | null)) {
    return { ok: true, role: 'admin' };
  }
  return { ok: true, role: 'anonymous' };
}

async function readJson(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json?.();
    if (body && typeof body === 'object') return body as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

export const tutorChatEndpoint: Endpoint = {
  path: '/omnia/tutor/chat',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    const question = String(body.question || body.text || '').trim();
    const courseId = body.courseId != null ? String(body.courseId) : '';
    if (!question) return json({ ok: false, error: 'question is required' }, 400);
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);

    const result = await runTutorAsk(req.payload, {
      question,
      sessionId: (body.sessionId as string | number | null) ?? null,
      userId: (body.userId != null ? String(body.userId) : auth.userId) || 'anonymous',
      role: (body.role != null ? String(body.role) : auth.role) || 'student',
      tenantId: body.tenantId != null ? String(body.tenantId) : null,
      language: body.language != null ? String(body.language) : 'pt-BR',
      courseId,
      courseTitle: body.courseTitle != null ? String(body.courseTitle) : null,
      moduleId: body.moduleId != null ? String(body.moduleId) : null,
      moduleTitle: body.moduleTitle != null ? String(body.moduleTitle) : null,
      lessonId: body.lessonId != null ? String(body.lessonId) : null,
      lessonTitle: body.lessonTitle != null ? String(body.lessonTitle) : null,
      lessonObjectives:
        body.lessonObjectives != null ? String(body.lessonObjectives) : null,
      ownerCompanyId: body.ownerCompanyId != null ? String(body.ownerCompanyId) : null,
      requestStudyPlan: Boolean(body.requestStudyPlan),
      objective: body.objective != null ? String(body.objective) : null,
    });

    return json({
      ok: true,
      data: {
        sessionId: result.sessionId,
        text: result.answer.formattedText || result.answer.text,
        rawText: result.answer.text,
        sources: result.answer.sources,
        confidence: result.answer.confidence,
        tookMs: result.answer.tookMs,
        model: result.answer.model,
        provider: result.answer.provider,
        tokens: {
          prompt: result.answer.promptTokens,
          completion: result.answer.completionTokens,
          total: result.answer.totalTokens,
        },
        status: result.answer.status,
        errorCode: result.answer.errorCode ?? null,
        intent: result.answer.intent,
        grounding: result.answer.grounding,
        explainability: result.answer.explainability,
        sourceCount: result.answer.sources.length,
        level: result.level,
        levelLabel: result.levelLabel,
        student: result.student,
        learning: result.learning,
        recommendations: result.recommendations,
        studyPlan: result.studyPlan,
        gaps: result.gaps,
        encouragement: result.encouragement,
        personalizedHint: result.personalizedHint,
      },
    });
  },
};

export const tutorProfileEndpoint: Endpoint = {
  path: '/omnia/tutor/profile',
  method: 'get',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId');
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);
    const userId = url.searchParams.get('userId') || auth.userId || 'anonymous';

    const student = await syncStudentProfile(req.payload, {
      userId,
      courseId,
      language: url.searchParams.get('language') || 'pt-BR',
    });
    const learning = await syncLearningProfile(req.payload, {
      userId,
      courseId,
      student,
    });
    const catalog = await loadCourseCatalog(req.payload, courseId);

    return json({
      ok: true,
      data: {
        student,
        learning,
        nextLessons: catalog?.lessons
          .filter((l) => !student.completedLessonIds.includes(l.id))
          .slice(0, 3),
      },
    });
  },
};

export const tutorDashboardRefreshEndpoint: Endpoint = {
  path: '/omnia/tutor/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const secret = process.env.OMNIA_INTERNAL_API_SECRET;
    const key = req.headers.get('x-omnia-internal-key') || req.headers.get('x-omnia-internal-secret');
    if (!(secret && key === secret) && !isKiStaff(req.user as { role?: unknown } | null)) {
      return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }
    await refreshTutorDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'neurofrigo-tutor-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const tutorEndpoints = [
  tutorChatEndpoint,
  tutorProfileEndpoint,
  tutorDashboardRefreshEndpoint,
];
