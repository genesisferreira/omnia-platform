import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
import { runNeurofrigoAsk, submitAiFeedback } from '../services/neurofrigo/ask';
import { refreshNeurofrigoAiDashboard } from '../services/neurofrigo/dashboard';

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

export const neurofrigoChatEndpoint: Endpoint = {
  path: '/omnia/ai/chat',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    const question = String(body.question || body.text || '').trim();
    if (!question) return json({ ok: false, error: 'question is required' }, 400);

    let result;
    try {
      result = await runNeurofrigoAsk(req.payload, {
        question,
        sessionId: (body.sessionId as string | number | null) ?? null,
        assistantId: body.assistantId != null ? String(body.assistantId) : 'auto',
        orchestrate: body.orchestrate !== false,
        identity: {
          userId: (body.userId != null ? String(body.userId) : auth.userId) || null,
          role: (body.role != null ? String(body.role) : auth.role) || null,
          tenantId: body.tenantId != null ? String(body.tenantId) : null,
          companyIds: Array.isArray(body.companyIds) ? body.companyIds : undefined,
          language: body.language != null ? String(body.language) : 'pt-BR',
          profileLabel: body.profileLabel != null ? String(body.profileLabel) : null,
        },
        course: {
          courseId: body.courseId != null ? String(body.courseId) : null,
          courseTitle: body.courseTitle != null ? String(body.courseTitle) : null,
          moduleId: body.moduleId != null ? String(body.moduleId) : null,
          moduleTitle: body.moduleTitle != null ? String(body.moduleTitle) : null,
          lessonId: body.lessonId != null ? String(body.lessonId) : null,
          lessonTitle: body.lessonTitle != null ? String(body.lessonTitle) : null,
          lessonObjectives:
            body.lessonObjectives != null ? String(body.lessonObjectives) : null,
          ownerCompanyId: body.ownerCompanyId != null ? String(body.ownerCompanyId) : null,
        },
        topK: body.topK != null ? Number(body.topK) : undefined,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN')) {
        return json({ ok: false, error: err.message }, 403);
      }
      if (err instanceof Error && err.message.includes('DEEPSEEK_API_KEY_MISSING')) {
        return json({ ok: false, error: 'PROVIDER_UNAVAILABLE:DeepSeek key missing' }, 503);
      }
      throw err;
    }

    const { answer, sessionId, assistantKey, specialistLabel, orchestrator, providerMeta, modelKey, policyDecision, proposalMarkdown, recommendations } =
      result;

    return json({
      ok: true,
      data: {
        sessionId,
        assistantId: assistantKey || (body.assistantId != null ? String(body.assistantId) : 'auto'),
        assistant: assistantKey || null,
        specialistLabel: specialistLabel || null,
        text: answer.formattedText || answer.text,
        rawText: answer.text,
        sources: answer.sources,
        confidence: answer.confidence,
        tookMs: answer.tookMs,
        model: answer.model,
        modelKey: modelKey || answer.model || null,
        provider: answer.provider,
        tokens: {
          prompt: answer.promptTokens,
          completion: answer.completionTokens,
          total: answer.totalTokens,
        },
        estimatedCostUsd: answer.estimatedCostUsd,
        status: answer.status,
        errorCode: answer.errorCode ?? null,
        intent: answer.intent,
        grounding: answer.grounding,
        explainability: answer.explainability,
        sourceCount: answer.sources.length,
        policyDecision: policyDecision || null,
        proposalMarkdown: proposalMarkdown || null,
        recommendations: recommendations || null,
        orchestrator: orchestrator || null,
        providerMeta: providerMeta || null,
      },
    });
  },
};

export const neurofrigoFeedbackEndpoint: Endpoint = {
  path: '/omnia/ai/feedback',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const body = await readJson(req);
    const sessionId = body.sessionId;
    const rating = String(body.rating || '');
    if (sessionId == null || (rating !== 'up' && rating !== 'down')) {
      return json({ ok: false, error: 'sessionId and rating(up|down) required' }, 400);
    }
    const created = await submitAiFeedback(req.payload, {
      sessionId: sessionId as string | number,
      rating,
      comment: body.comment != null ? String(body.comment) : null,
      userId: auth.userId ?? null,
    });
    return json({ ok: true, data: { id: created.id } });
  },
};

export const neurofrigoDashboardRefreshEndpoint: Endpoint = {
  path: '/omnia/ai/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const secret = process.env.OMNIA_INTERNAL_API_SECRET;
    const key = req.headers.get('x-omnia-internal-key') || req.headers.get('x-omnia-internal-secret');
    if (!(secret && key === secret) && !isKiStaff(req.user as { role?: unknown } | null)) {
      return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }
    await refreshNeurofrigoAiDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'neurofrigo-ai-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const neurofrigoEndpoints = [
  neurofrigoChatEndpoint,
  neurofrigoFeedbackEndpoint,
  neurofrigoDashboardRefreshEndpoint,
];
