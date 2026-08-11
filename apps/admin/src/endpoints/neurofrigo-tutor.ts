import type { Endpoint, PayloadRequest } from 'payload';

import {
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
  resolveSubjectUserKey,
} from '../services/neurofrigo/auth-context';
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;

    const body = await readJson(req);
    const question = String(body.question || body.text || '').trim();
    const courseId = body.courseId != null ? String(body.courseId) : '';
    if (!question) return json({ ok: false, error: 'question is required' }, 400);
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);

    const subject = resolveSubjectUserKey(auth, body.userId != null ? String(body.userId) : null);
    if (isAuthResponse(subject)) return subject;

    const result = await runTutorAsk(req.payload, {
      question,
      sessionId: (body.sessionId as string | number | null) ?? null,
      userId: subject.userKey,
      role: auth.role,
      tenantId: body.tenantId != null ? String(body.tenantId) : null,
      language: body.language != null ? String(body.language) : 'pt-BR',
      courseId,
      courseTitle: body.courseTitle != null ? String(body.courseTitle) : null,
      moduleId: body.moduleId != null ? String(body.moduleId) : null,
      moduleTitle: body.moduleTitle != null ? String(body.moduleTitle) : null,
      lessonId: body.lessonId != null ? String(body.lessonId) : null,
      lessonTitle: body.lessonTitle != null ? String(body.lessonTitle) : null,
      lessonObjectives: body.lessonObjectives != null ? String(body.lessonObjectives) : null,
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId');
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);

    const subject = resolveSubjectUserKey(auth, url.searchParams.get('userId'));
    if (isAuthResponse(subject)) return subject;
    const userId = subject.userKey;

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
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
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
