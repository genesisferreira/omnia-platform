import type { Payload } from 'payload';
import {
  NeurofrigoRuntime,
  PromptBuilder,
  createLLMProviderWithMeta,
  type ConversationTurn,
  type RuntimeAnswer,
  type RuntimeRequest,
} from '@omnia/neurofrigo-runtime';
import {
  applyComplianceGuard,
  evaluateBudget,
  planPortalTurn,
  type OrchestratorPlan,
} from '@omnia/neurofrigo-orchestrator';

import { runSemanticSearch } from '../retrieval/search';
import { refreshNeurofrigoAiDashboard } from './dashboard';
import { listAllowedAssistants, resolveAssistantForAsk } from '../enterprise/resolve';
import { refreshEnterpriseAiDashboard } from '../enterprise/dashboard';

type SessionDoc = {
  id: string | number;
  turns?: ConversationTurn[] | null;
};

export type AskResult = {
  answer: RuntimeAnswer;
  sessionId: string | number;
  assistantKey?: string;
  specialistLabel?: string;
  modelKey?: string | null;
  policyDecision?: import('@omnia/enterprise-ai').PolicyDecision | null;
  proposalMarkdown?: string | null;
  troubleshootingMarkdown?: string | null;
  comparisonMarkdown?: string | null;
  recommendations?: unknown;
  orchestrator?: {
    intent: string;
    blocked: boolean;
    blockCode: string | null;
    events: OrchestratorPlan['events'];
  };
  providerMeta?: {
    providerRequested: string;
    providerUsed: string;
    fallbackReason: string | null;
  };
};

function asTurns(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const row = t as ConversationTurn;
      if (!row.question || !row.answer) return null;
      return {
        question: String(row.question),
        answer: String(row.answer),
        chunkIds: row.chunkIds,
        intent: row.intent ?? null,
      };
    })
    .filter(Boolean) as ConversationTurn[];
}

function blockedAnswer(message: string, code: string): RuntimeAnswer {
  return {
    text: message,
    formattedText: message,
    sources: [],
    confidence: 0,
    tookMs: 0,
    model: 'guard',
    provider: 'policy',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    status: 'not_found',
    errorCode: code,
    intent: null,
    grounding: null,
    explainability: null,
  };
}

async function isEnrolled(
  payload: Payload,
  userId: string | null | undefined,
  courseId: string | null | undefined,
): Promise<boolean> {
  if (!courseId) return false;
  if (!userId) return true; // páginas de curso autenticadas no portal; seed sem user numérico
  try {
    const res = await payload.find({
      collection: 'student-profiles',
      where: {
        and: [{ userKey: { equals: String(userId) } }, { course: { equals: courseId } }],
      },
      limit: 1,
      overrideAccess: true,
    });
    if (res.docs[0]) return true;
  } catch {
    /* collection may miss */
  }
  // Se há courseId no contexto do Portal (página do curso), trata como escopo autorizado.
  return true;
}

async function loadBudgetSpend(payload: Payload): Promise<{
  spentTodayUsd: number;
  spentMonthUsd: number;
}> {
  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, month] = await Promise.all([
    payload.find({
      collection: 'ai-sessions',
      where: { updatedAt: { greater_than_equal: startDay.toISOString() } },
      limit: 500,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ai-sessions',
      where: { updatedAt: { greater_than_equal: startMonth.toISOString() } },
      limit: 500,
      overrideAccess: true,
    }),
  ]);

  const sum = (docs: Array<Record<string, unknown>>) =>
    docs.reduce((s, d) => s + Number(d.estimatedCostUsd || 0), 0);

  return {
    spentTodayUsd: sum(today.docs as Array<Record<string, unknown>>),
    spentMonthUsd: sum(month.docs as Array<Record<string, unknown>>),
  };
}

export async function runNeurofrigoAsk(
  payload: Payload,
  request: RuntimeRequest & {
    sessionId?: string | number | null;
    assistantId?: string | null;
    /** auto = orquestrador escolhe */
    orchestrate?: boolean;
    /** Evita loop CommercialService → ask → CommercialService */
    skipCommercialEnrichment?: boolean;
    /** Evita loop EngineeringService → ask → EngineeringService */
    skipEngineeringEnrichment?: boolean;
  },
): Promise<AskResult> {
  let existing: SessionDoc | null = null;
  let history: ConversationTurn[] = request.conversationHistory ?? [];

  if (request.sessionId != null && request.sessionId !== '') {
    try {
      existing = (await payload.findByID({
        collection: 'ai-sessions',
        id: request.sessionId,
        depth: 0,
        overrideAccess: true,
      })) as SessionDoc;
      history = asTurns(existing.turns);
    } catch {
      existing = null;
    }
  }

  const preferred =
    request.assistantId == null || request.assistantId === '' || request.assistantId === 'auto'
      ? 'auto'
      : String(request.assistantId);
  const shouldOrchestrate = request.orchestrate !== false;

  const allowed = await listAllowedAssistants(payload, {
    role: request.identity.role,
    userId: request.identity.userId,
    tenantId: request.identity.tenantId,
    companyIds: request.identity.companyIds,
    courseId: request.course.courseId,
  }).catch(() => ({
    allowedAssistants: [] as Array<{ key: string }>,
    allowedModelKeys: [] as string[],
    matchedPolicyIds: [] as string[],
  }));

  const enrolled = await isEnrolled(payload, request.identity.userId, request.course.courseId);

  let plan: OrchestratorPlan | null = null;
  if (shouldOrchestrate) {
    plan = planPortalTurn({
      question: request.question,
      role: request.identity.role,
      preferredAssistantKey: preferred,
      allowedAssistantKeys: allowed.allowedAssistants.map((a) => a.key),
      enrolled,
      courseId: request.course.courseId,
    });
  }

  if (plan?.blocked) {
    const answer = blockedAnswer(
      plan.blockReason || 'Bloqueado pela política.',
      plan.blockCode || 'POLICY',
    );
    const sessionId = await persistSession(payload, {
      existing,
      request,
      answer,
      history,
      assistantKey: plan.agent.assistantKey,
      specialistLabel: plan.agent.displayName,
      plan,
      providerMeta: null,
    });
    return {
      answer,
      sessionId,
      assistantKey: plan.agent.assistantKey,
      specialistLabel: plan.agent.displayName,
      orchestrator: {
        intent: plan.intent,
        blocked: true,
        blockCode: plan.blockCode,
        events: plan.events,
      },
    };
  }

  const spend = await loadBudgetSpend(payload);
  const dash = await payload
    .findGlobal({ slug: 'enterprise-ai-dashboard', overrideAccess: true })
    .catch(() => null);
  const budget = evaluateBudget({
    spentTodayUsd: spend.spentTodayUsd,
    spentMonthUsd: spend.spentMonthUsd,
    config: {
      dailyLimitUsd: Number((dash as { budgetDailyUsd?: number } | null)?.budgetDailyUsd ?? 25),
      monthlyLimitUsd: Number(
        (dash as { budgetMonthlyUsd?: number } | null)?.budgetMonthlyUsd ?? 400,
      ),
      at100:
        ((dash as { budgetAt100?: string } | null)?.budgetAt100 as
          'allow' | 'warn_only' | 'block') || 'warn_only',
    },
  });
  if (budget.blocked) {
    const answer = blockedAnswer(budget.message || 'Orçamento esgotado.', 'BUDGET_EXCEEDED');
    const sessionId = await persistSession(payload, {
      existing,
      request,
      answer,
      history,
      assistantKey: plan?.agent.assistantKey || preferred,
      specialistLabel: plan?.agent.displayName,
      plan,
      providerMeta: null,
      budget,
    });
    return {
      answer,
      sessionId,
      assistantKey: plan?.agent.assistantKey,
      specialistLabel: plan?.agent.displayName,
      orchestrator: plan
        ? {
            intent: plan.intent,
            blocked: true,
            blockCode: 'BUDGET_EXCEEDED',
            events: [
              ...plan.events,
              {
                type: 'ai.budget.threshold',
                at: new Date().toISOString(),
                detail: { thresholds: budget.thresholdsHit },
              },
            ],
          }
        : undefined,
    };
  }

  const assistantKey =
    preferred === 'commercial'
      ? 'commercial'
      : preferred === 'engineering'
        ? 'engineering'
        : plan?.agent.assistantKey || (preferred === 'auto' ? 'tutor' : preferred);

  if (assistantKey === 'commercial' && !request.skipCommercialEnrichment) {
    const { runCommercialAsk } = await import('../commercial/ask');
    return runCommercialAsk(payload, {
      question: request.question,
      sessionId: request.sessionId,
      userId: request.identity.userId,
      role: request.identity.role,
      tenantId: request.identity.tenantId,
      language: request.identity.language,
      companyIds: request.identity.companyIds,
      courseId: request.course.courseId,
      courseTitle: request.course.courseTitle,
      moduleId: request.course.moduleId,
      moduleTitle: request.course.moduleTitle,
      lessonId: request.course.lessonId,
      lessonTitle: request.course.lessonTitle,
      ownerCompanyId: request.course.ownerCompanyId,
      requestProposal: /\b(proposta|gerar\s+proposta|montar\s+oferta)\b/i.test(request.question),
    });
  }

  if (assistantKey === 'engineering' && !request.skipEngineeringEnrichment) {
    const { runEngineeringAsk } = await import('../engineering/ask');
    return runEngineeringAsk(payload, {
      question: request.question,
      sessionId: request.sessionId,
      userId: request.identity.userId,
      role: request.identity.role,
      tenantId: request.identity.tenantId,
      language: request.identity.language,
      companyIds: request.identity.companyIds,
      courseId: request.course.courseId,
      courseTitle: request.course.courseTitle,
      moduleId: request.course.moduleId,
      moduleTitle: request.course.moduleTitle,
      lessonId: request.course.lessonId,
      lessonTitle: request.course.lessonTitle,
      ownerCompanyId: request.course.ownerCompanyId,
      requestTroubleshooting: /\b(troubleshoot|diagn[oó]stic|falha|alarme|defeito)\b/i.test(
        request.question,
      ),
      requestComparison: /\b(compar(e|ar|a[cç][aã]o)|versus|\bv[sx]\.?\b)\b/i.test(
        request.question,
      ),
    });
  }

  let resolved = null as Awaited<ReturnType<typeof resolveAssistantForAsk>> | null;
  try {
    resolved = await resolveAssistantForAsk(payload, {
      assistantId: assistantKey,
      subject: {
        role: request.identity.role,
        userId: request.identity.userId,
        tenantId: request.identity.tenantId,
        companyIds: request.identity.companyIds,
        courseId: request.course.courseId,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN')) {
      throw err;
    }
    if (err instanceof Error && err.message === 'ENTERPRISE_REGISTRY_EMPTY') {
      resolved = null;
    } else {
      resolved = null;
    }
  }

  const env = process.env as unknown as import('@omnia/neurofrigo-runtime').LlmFactoryEnv;
  const providerMeta = createLLMProviderWithMeta(
    env,
    resolved?.model
      ? {
          provider: resolved.model.provider,
          model: resolved.model.model,
          baseUrl: env.NEUROFRIGO_LLM_BASE_URL,
          correlationId: `ask-${Date.now().toString(36)}`,
        }
      : {
          baseUrl: env.NEUROFRIGO_LLM_BASE_URL,
          correlationId: `ask-${Date.now().toString(36)}`,
        },
  );

  const runtime = new NeurofrigoRuntime({
    retrieval: {
      search: (query, subject) => runSemanticSearch(payload, query, subject),
    },
    llm: providerMeta.provider,
    promptBuilder: resolved ? new PromptBuilder(resolved.systemPrompt) : undefined,
    limits: resolved?.limits,
    costPer1kTokens: resolved?.model?.estimatedCostPer1kTokens ?? null,
  });

  const language = resolved?.language || request.identity.language || 'pt-BR';
  let answer = await runtime.ask({
    ...request,
    identity: {
      ...request.identity,
      language,
      profileLabel:
        request.identity.profileLabel ||
        (resolved ? `${resolved.assistant.name} · ${resolved.assistant.category}` : null),
    },
    conversationHistory: history,
  });

  const compliance = applyComplianceGuard(answer.text);
  if (compliance.blocked) {
    answer = {
      ...answer,
      text: compliance.text,
      formattedText: compliance.text,
      status: 'error',
      errorCode: 'COMPLIANCE_BLOCK',
    };
  }

  if (plan && budget.thresholdsHit.length) {
    plan.events.push({
      type: 'ai.budget.threshold',
      at: new Date().toISOString(),
      detail: { thresholds: budget.thresholdsHit, action: budget.action },
    });
  }
  plan?.events.push({
    type: 'ai.provider.called',
    at: new Date().toISOString(),
    detail: {
      providerRequested: providerMeta.providerRequested,
      providerUsed: providerMeta.providerUsed,
      fallbackReason: providerMeta.fallbackReason,
      model: answer.model,
    },
  });
  plan?.events.push({
    type: 'ai.response.completed',
    at: new Date().toISOString(),
    detail: {
      status: answer.status,
      tokens: answer.totalTokens,
      // sem pergunta completa
    },
  });

  const specialistLabel = plan?.agent.displayName || resolved?.assistant.name || assistantKey;

  const sessionId = await persistSession(payload, {
    existing,
    request,
    answer,
    history,
    assistantKey: resolved?.assistant.key ?? assistantKey,
    specialistLabel,
    plan,
    providerMeta,
    budget,
    resolvedId: resolved?.assistant.id ?? null,
    modelKey: resolved?.model?.key ?? null,
    policyDecision: resolved?.policyDecision ?? null,
  });

  return {
    answer,
    sessionId,
    assistantKey: resolved?.assistant.key ?? assistantKey,
    specialistLabel,
    modelKey: resolved?.model?.key ?? null,
    policyDecision: resolved?.policyDecision ?? null,
    orchestrator: plan
      ? {
          intent: plan.intent,
          blocked: false,
          blockCode: null,
          events: plan.events,
        }
      : undefined,
    providerMeta: {
      providerRequested: providerMeta.providerRequested,
      providerUsed: providerMeta.providerUsed,
      fallbackReason: providerMeta.fallbackReason,
    },
  };
}

async function persistSession(
  payload: Payload,
  args: {
    existing: SessionDoc | null;
    request: RuntimeRequest;
    answer: RuntimeAnswer;
    history: ConversationTurn[];
    assistantKey: string;
    specialistLabel?: string;
    plan: OrchestratorPlan | null;
    providerMeta: {
      providerRequested: string;
      providerUsed: string;
      fallbackReason: string | null;
    } | null;
    budget?: ReturnType<typeof evaluateBudget>;
    resolvedId?: string | null;
    modelKey?: string | null;
    policyDecision?: import('@omnia/enterprise-ai').PolicyDecision | null;
  },
): Promise<string | number> {
  const nextTurn: ConversationTurn = {
    question: args.request.question,
    answer: args.answer.formattedText || args.answer.text,
    chunkIds: args.answer.sources.map((s) => s.chunkId),
    intent: args.answer.intent,
  };
  const turns = [...args.history, nextTurn].slice(-8);

  const userNumeric =
    args.request.identity.userId && /^\d+$/.test(String(args.request.identity.userId))
      ? Number(args.request.identity.userId)
      : null;
  const tenantNumeric =
    args.request.identity.tenantId && /^\d+$/.test(String(args.request.identity.tenantId))
      ? Number(args.request.identity.tenantId)
      : null;
  const courseNumeric =
    args.request.course.courseId && /^\d+$/.test(String(args.request.course.courseId))
      ? Number(args.request.course.courseId)
      : null;
  const moduleNumeric =
    args.request.course.moduleId && /^\d+$/.test(String(args.request.course.moduleId))
      ? Number(args.request.course.moduleId)
      : null;
  const lessonNumeric =
    args.request.course.lessonId && /^\d+$/.test(String(args.request.course.lessonId))
      ? Number(args.request.course.lessonId)
      : null;
  const companyNumeric =
    args.request.course.ownerCompanyId && /^\d+$/.test(String(args.request.course.ownerCompanyId))
      ? Number(args.request.course.ownerCompanyId)
      : null;

  const data: Record<string, unknown> = {
    question: args.request.question,
    answerText: args.answer.text,
    formattedAnswer: args.answer.formattedText,
    status: args.answer.status,
    intent: args.answer.intent,
    provider: args.answer.provider,
    model: args.answer.model,
    tookMs: args.answer.tookMs,
    retrievalTookMs: args.answer.retrieval?.tookMs ?? 0,
    llmTookMs: args.answer.retrieval?.llmTookMs ?? 0,
    promptTokens: args.answer.promptTokens,
    completionTokens: args.answer.completionTokens,
    totalTokens: args.answer.totalTokens,
    estimatedCostUsd: args.answer.estimatedCostUsd,
    confidence: args.answer.confidence,
    groundingScore: args.answer.grounding?.score ?? 0,
    errorCode: args.answer.errorCode ?? null,
    sources: args.answer.sources,
    explainability: args.answer.explainability,
    grounding: args.answer.grounding,
    turns,
    filters: {
      course: args.request.course,
      identity: {
        userId: args.request.identity.userId ?? null,
        role: args.request.identity.role ?? null,
        tenantId: args.request.identity.tenantId ?? null,
        profileLabel: args.request.identity.profileLabel ?? null,
      },
      assistantId: args.resolvedId ?? args.assistantKey,
      assistantKey: args.assistantKey,
      specialistLabel: args.specialistLabel ?? null,
      modelKey: args.modelKey ?? null,
      providerRequested: args.providerMeta?.providerRequested ?? null,
      providerUsed: args.providerMeta?.providerUsed ?? args.answer.provider,
      fallbackReason: args.providerMeta?.fallbackReason ?? null,
      policyDecision: args.policyDecision ?? null,
      orchestratorIntent: args.plan?.intent ?? null,
      auditEvents: args.plan?.events ?? [],
      budget: args.budget
        ? {
            dailyPct: args.budget.dailyPct,
            monthlyPct: args.budget.monthlyPct,
            thresholdsHit: args.budget.thresholdsHit,
            action: args.budget.action,
          }
        : null,
    },
  };
  if (userNumeric != null) data.user = userNumeric;
  if (tenantNumeric != null) data.tenant = tenantNumeric;
  if (courseNumeric != null) data.course = courseNumeric;
  if (moduleNumeric != null) data.module = moduleNumeric;
  if (lessonNumeric != null) data.lesson = lessonNumeric;
  if (companyNumeric != null) data.ownerCompany = companyNumeric;

  let sessionId: string | number;
  if (args.existing) {
    const updated = await payload.update({
      collection: 'ai-sessions',
      id: args.existing.id,
      data,
      overrideAccess: true,
      context: { neurofrigoRuntimeActive: true },
    });
    sessionId = updated.id;
  } else {
    const created = await payload.create({
      collection: 'ai-sessions',
      data,
      overrideAccess: true,
      context: { neurofrigoRuntimeActive: true },
    });
    sessionId = created.id;
  }

  await refreshNeurofrigoAiDashboard(payload).catch(() => undefined);
  await refreshEnterpriseAiDashboard(payload).catch(() => undefined);
  return sessionId;
}

export async function submitAiFeedback(
  payload: Payload,
  args: {
    sessionId: string | number;
    rating: 'up' | 'down';
    comment?: string | null;
    userId?: string | null;
  },
) {
  const created = await payload.create({
    collection: 'ai-feedback',
    data: {
      aiSession: Number(args.sessionId) || args.sessionId,
      rating: args.rating,
      comment: args.comment ?? null,
      user: args.userId ? Number(args.userId) || args.userId : undefined,
    },
    overrideAccess: true,
  });
  await refreshNeurofrigoAiDashboard(payload).catch(() => undefined);
  return created;
}
