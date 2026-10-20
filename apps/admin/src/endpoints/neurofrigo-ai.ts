import type { Endpoint, PayloadRequest } from 'payload';

import { runNeurofrigoAsk, submitAiFeedback } from '../services/neurofrigo/ask';
import {
  bindRequestScope,
  hasValidInternalKey,
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
  resolveSessionScope,
  unauthorized,
} from '../services/neurofrigo/auth-context';
import { refreshNeurofrigoAiDashboard } from '../services/neurofrigo/dashboard';
import { ensureAnonymousConciergePolicy } from '../services/enterprise/ensure-anonymous-policy';

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

export const neurofrigoChatEndpoint: Endpoint = {
  path: '/omnia/ai/chat',
  method: 'post',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;

    const body = await readJson(req);
    const question = String(body.question || body.text || '').trim();
    if (!question) return json({ ok: false, error: 'question is required' }, 400);

    const session = await resolveSessionScope(req, auth);
    const scope = bindRequestScope({
      isStaff: auth.isStaff,
      sessionTenantId: session.tenantId,
      sessionCompanyIds: session.companyIds,
      requestedTenantId: body.tenantId != null ? String(body.tenantId) : null,
      requestedCompanyIds: body.companyIds,
    });

    let result;
    try {
      result = await runNeurofrigoAsk(req.payload, {
        question,
        sessionId: (body.sessionId as string | number | null) ?? null,
        assistantId: body.assistantId != null ? String(body.assistantId) : 'auto',
        orchestrate: body.orchestrate !== false,
        identity: {
          userId: auth.userId,
          role: auth.role,
          tenantId: scope.tenantId,
          companyIds: scope.companyIds,
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
          lessonObjectives: body.lessonObjectives != null ? String(body.lessonObjectives) : null,
          ownerCompanyId: auth.isStaff
            ? body.ownerCompanyId != null
              ? String(body.ownerCompanyId)
              : null
            : (scope.companyIds[0] ?? null),
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

    const {
      answer,
      sessionId,
      assistantKey,
      specialistLabel,
      orchestrator,
      providerMeta,
      modelKey,
      policyDecision,
      proposalMarkdown,
      troubleshootingMarkdown,
      comparisonMarkdown,
      recommendations,
    } = result;

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
        dialogueIntent: answer.dialogueIntent ?? null,
        grounding: answer.grounding,
        explainability: answer.explainability,
        suggestedActions: answer.suggestedActions ?? [],
        sourceCount: answer.sources.length,
        policyDecision: policyDecision || null,
        proposalMarkdown: proposalMarkdown || null,
        troubleshootingMarkdown: troubleshootingMarkdown || null,
        comparisonMarkdown: comparisonMarkdown || null,
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
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
      userId: auth.userId,
    });
    return json({ ok: true, data: { id: created.id } });
  },
};

export const neurofrigoDashboardRefreshEndpoint: Endpoint = {
  path: '/omnia/ai/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
    await refreshNeurofrigoAiDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'neurofrigo-ai-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

/** List AI sessions owned by the authenticated subject (EPIC 16 history). */
export const neurofrigoSessionsListEndpoint: Endpoint = {
  path: '/omnia/ai/sessions',
  method: 'get',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;

    const url = new URL(req.url || 'http://local');
    const limit = Math.min(Number(url.searchParams.get('limit') || 30), 50);
    const userNumeric = /^\d+$/.test(auth.userId) ? Number(auth.userId) : null;
    if (userNumeric == null) {
      return json({ ok: true, data: { sessions: [] } });
    }

    const session = await resolveSessionScope(req, auth);
    const and: Array<{ user?: { equals: number }; tenant?: { equals: number } }> = [
      { user: { equals: userNumeric } },
    ];
    if (session.tenantId && /^\d+$/.test(String(session.tenantId))) {
      and.push({ tenant: { equals: Number(session.tenantId) } });
    }

    const found = await req.payload.find({
      collection: 'ai-sessions',
      where: { and },
      sort: '-updatedAt',
      limit,
      overrideAccess: true,
    });

    return json({
      ok: true,
      data: {
        sessions: found.docs.map((doc) => {
          const row = doc as {
            id: string | number;
            question?: string;
            answerText?: string | null;
            status?: string | null;
            intent?: string | null;
            updatedAt?: string;
            createdAt?: string;
            course?: string | number | { id?: string | number } | null;
          };
          const course =
            row.course == null
              ? null
              : typeof row.course === 'object'
                ? (row.course.id ?? null)
                : row.course;
          return {
            id: row.id,
            question: row.question || '',
            answerText: row.answerText ?? null,
            status: row.status ?? null,
            intent: row.intent ?? null,
            updatedAt: row.updatedAt ?? null,
            createdAt: row.createdAt ?? null,
            courseId: course,
          };
        }),
      },
    });
  },
};

/** Open one AI session if owned by the authenticated subject. */
export const neurofrigoSessionGetEndpoint: Endpoint = {
  path: '/omnia/ai/sessions/:id',
  method: 'get',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;

    const idParam = req.routeParams?.id;
    const sessionId = Array.isArray(idParam) ? idParam[0] : idParam;
    if (sessionId == null || sessionId === '') {
      return json({ ok: false, error: 'session id required' }, 400);
    }

    let doc;
    try {
      doc = await req.payload.findByID({
        collection: 'ai-sessions',
        id: sessionId,
        overrideAccess: true,
      });
    } catch {
      return json({ ok: false, error: 'NOT_FOUND' }, 404);
    }

    const owner =
      doc.user == null
        ? null
        : typeof doc.user === 'object'
          ? String((doc.user as { id?: string | number }).id ?? '')
          : String(doc.user);
    if (!owner || owner !== String(auth.userId)) {
      return json({ ok: false, error: 'FORBIDDEN' }, 403);
    }

    const session = await resolveSessionScope(req, auth);
    const sessionTenant =
      doc.tenant == null
        ? null
        : typeof doc.tenant === 'object'
          ? String((doc.tenant as { id?: string | number }).id ?? '')
          : String(doc.tenant);
    if (session.tenantId && sessionTenant && String(session.tenantId) !== sessionTenant) {
      return json({ ok: false, error: 'FORBIDDEN' }, 403);
    }

    return json({
      ok: true,
      data: {
        id: doc.id,
        question: doc.question,
        answerText: doc.answerText,
        status: doc.status,
        intent: doc.intent,
        turns: doc.turns ?? null,
        sources: doc.sources ?? null,
        explainability: doc.explainability ?? null,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
      },
    });
  },
};

/** Public Concierge chat — internal key + anonymous session only (no user elevation). */
export const neurofrigoPublicChatEndpoint: Endpoint = {
  path: '/omnia/ai/public-chat',
  method: 'post',
  handler: async (req) => {
    if (!hasValidInternalKey(req)) return unauthorized();

    const body = await readJson(req);
    const question = String(body.question || body.text || '').trim();
    if (!question) return json({ ok: false, error: 'question is required' }, 400);

    const anonymousSessionId = String(body.anonymousSessionId || '').trim();
    if (!anonymousSessionId || anonymousSessionId.length < 16 || anonymousSessionId.length > 80) {
      return json({ ok: false, error: 'anonymousSessionId required' }, 400);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(anonymousSessionId)) {
      return json({ ok: false, error: 'invalid anonymousSessionId' }, 400);
    }

    const requestedAssistant =
      body.assistantId != null ? String(body.assistantId).trim().toLowerCase() : 'concierge';
    if (requestedAssistant !== 'concierge' && requestedAssistant !== 'auto') {
      return json({ ok: false, error: 'ASSISTANT_FORBIDDEN:public_concierge_only' }, 403);
    }

    const anonUserId = `anon:${anonymousSessionId}`;

    // Continuations must belong to this anonymous id (never authenticated user sessions).
    if (body.sessionId != null && body.sessionId !== '') {
      try {
        const existing = await req.payload.findByID({
          collection: 'ai-sessions',
          id: body.sessionId as string | number,
          depth: 0,
          overrideAccess: true,
        });
        const filters =
          existing.filters && typeof existing.filters === 'object'
            ? (existing.filters as Record<string, unknown>)
            : {};
        const identity =
          filters.identity && typeof filters.identity === 'object'
            ? (filters.identity as Record<string, unknown>)
            : {};
        const owner = String(identity.userId || '');
        if (existing.user != null || owner !== anonUserId) {
          return json({ ok: false, error: 'FORBIDDEN' }, 403);
        }
      } catch {
        return json({ ok: false, error: 'NOT_FOUND' }, 404);
      }
    }

    await ensureAnonymousConciergePolicy(req.payload);

    let result;
    try {
      result = await runNeurofrigoAsk(req.payload, {
        question,
        sessionId: (body.sessionId as string | number | null) ?? null,
        assistantId: 'concierge',
        orchestrate: true,
        channel: 'portal_public',
        identity: {
          userId: anonUserId,
          role: 'anonymous',
          tenantId: null,
          companyIds: [],
          language: body.language != null ? String(body.language) : 'pt-BR',
          profileLabel: 'Visitante · Concierge',
        },
        course: {
          courseId: null,
          courseTitle: null,
          moduleId: null,
          moduleTitle: null,
          lessonId: null,
          lessonTitle: null,
          lessonObjectives: null,
          ownerCompanyId: null,
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

    return json({
      ok: true,
      data: {
        sessionId: result.sessionId,
        assistant: result.assistantKey,
        specialistLabel: result.specialistLabel ?? null,
        model: result.answer.model,
        provider: result.answer.provider,
        text: result.answer.formattedText || result.answer.text,
        formattedText: result.answer.formattedText,
        rawText: result.answer.text,
        sources: result.answer.sources,
        confidence: result.answer.confidence,
        tookMs: result.answer.tookMs,
        groundingScore: result.answer.grounding?.score ?? null,
        grounding: result.answer.grounding,
        explainability: result.answer.explainability,
        suggestedActions: result.answer.suggestedActions ?? [],
        status: result.answer.status,
        errorCode: result.answer.errorCode,
        intent: result.answer.intent,
        dialogueIntent: result.answer.dialogueIntent ?? null,
        latency: result.answer.tookMs,
        sourceCount: result.answer.sources.length,
        policyDecision: result.policyDecision ?? null,
        channel: 'portal_public',
      },
    });
  },
};

export const neurofrigoEndpoints = [
  neurofrigoChatEndpoint,
  neurofrigoPublicChatEndpoint,
  neurofrigoFeedbackEndpoint,
  neurofrigoDashboardRefreshEndpoint,
  neurofrigoSessionsListEndpoint,
  neurofrigoSessionGetEndpoint,
];
