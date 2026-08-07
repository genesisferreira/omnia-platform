import type { Payload } from 'payload';
import {
  NeurofrigoRuntime,
  PromptBuilder,
  createLLMProvider,
  type ConversationTurn,
  type RuntimeAnswer,
  type RuntimeRequest,
} from '@omnia/neurofrigo-runtime';

import { runSemanticSearch } from '../retrieval/search';
import { refreshNeurofrigoAiDashboard } from './dashboard';
import { resolveAssistantForAsk } from '../enterprise/resolve';
import { refreshEnterpriseAiDashboard } from '../enterprise/dashboard';

type SessionDoc = {
  id: string | number;
  turns?: ConversationTurn[] | null;
  question?: string | null;
  answerText?: string | null;
  sources?: unknown;
  course?: unknown;
  lesson?: unknown;
  module?: unknown;
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

export async function runNeurofrigoAsk(
  payload: Payload,
  request: RuntimeRequest & {
    sessionId?: string | number | null;
    assistantId?: string | null;
  },
): Promise<{ answer: RuntimeAnswer; sessionId: string | number; assistantKey?: string }> {
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

  let resolved = null as Awaited<ReturnType<typeof resolveAssistantForAsk>> | null;
  try {
    resolved = await resolveAssistantForAsk(payload, {
      assistantId: request.assistantId ?? 'tutor',
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
    // Sem registry seedado ainda — fallback Runtime default (compat Epic 05–07).
    resolved = null;
  }

  const llm = createLLMProvider(
    process.env as unknown as import('@omnia/neurofrigo-runtime').LlmFactoryEnv,
    resolved?.model
      ? { provider: resolved.model.provider, model: resolved.model.model }
      : undefined,
  );

  const runtime = new NeurofrigoRuntime({
    retrieval: {
      search: (query, subject) => runSemanticSearch(payload, query, subject),
    },
    llm,
    promptBuilder: resolved
      ? new PromptBuilder(resolved.systemPrompt)
      : undefined,
    limits: resolved?.limits,
  });

  const language = resolved?.language || request.identity.language || 'pt-BR';
  const answer = await runtime.ask({
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

  const nextTurn: ConversationTurn = {
    question: request.question,
    answer: answer.formattedText || answer.text,
    chunkIds: answer.sources.map((s) => s.chunkId),
    intent: answer.intent,
  };
  const turns = [...history, nextTurn].slice(-8);

  const userNumeric =
    request.identity.userId && /^\d+$/.test(String(request.identity.userId))
      ? Number(request.identity.userId)
      : null;
  const tenantNumeric =
    request.identity.tenantId && /^\d+$/.test(String(request.identity.tenantId))
      ? Number(request.identity.tenantId)
      : null;
  const courseNumeric =
    request.course.courseId && /^\d+$/.test(String(request.course.courseId))
      ? Number(request.course.courseId)
      : null;
  const moduleNumeric =
    request.course.moduleId && /^\d+$/.test(String(request.course.moduleId))
      ? Number(request.course.moduleId)
      : null;
  const lessonNumeric =
    request.course.lessonId && /^\d+$/.test(String(request.course.lessonId))
      ? Number(request.course.lessonId)
      : null;
  const companyNumeric =
    request.course.ownerCompanyId && /^\d+$/.test(String(request.course.ownerCompanyId))
      ? Number(request.course.ownerCompanyId)
      : null;

  const data: Record<string, unknown> = {
    question: request.question,
    answerText: answer.text,
    formattedAnswer: answer.formattedText,
    status: answer.status,
    intent: answer.intent,
    provider: answer.provider,
    model: answer.model,
    tookMs: answer.tookMs,
    retrievalTookMs: answer.retrieval?.tookMs ?? 0,
    llmTookMs: answer.retrieval?.llmTookMs ?? 0,
    promptTokens: answer.promptTokens,
    completionTokens: answer.completionTokens,
    totalTokens: answer.totalTokens,
    estimatedCostUsd: answer.estimatedCostUsd,
    confidence: answer.confidence,
    groundingScore: answer.grounding?.score ?? 0,
    errorCode: answer.errorCode ?? null,
    sources: answer.sources,
    explainability: answer.explainability,
    grounding: answer.grounding,
    turns,
    filters: {
      course: request.course,
      identity: {
        userId: request.identity.userId ?? null,
        role: request.identity.role ?? null,
        tenantId: request.identity.tenantId ?? null,
        profileLabel: request.identity.profileLabel ?? null,
      },
      assistantId: resolved?.assistant.id ?? request.assistantId ?? null,
      assistantKey: resolved?.assistant.key ?? request.assistantId ?? 'default',
      modelKey: resolved?.model?.key ?? null,
    },
  };
  if (userNumeric != null) data.user = userNumeric;
  if (tenantNumeric != null) data.tenant = tenantNumeric;
  if (courseNumeric != null) data.course = courseNumeric;
  if (moduleNumeric != null) data.module = moduleNumeric;
  if (lessonNumeric != null) data.lesson = lessonNumeric;
  if (companyNumeric != null) data.ownerCompany = companyNumeric;

  let sessionId: string | number;
  if (existing) {
    const updated = await payload.update({
      collection: 'ai-sessions',
      id: existing.id,
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
  return {
    answer,
    sessionId,
    assistantKey: resolved?.assistant.key ?? request.assistantId ?? undefined,
  };
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
