import type { Payload } from 'payload';
import {
  NeurofrigoRuntime,
  createLLMProvider,
  type ConversationTurn,
  type RuntimeAnswer,
  type RuntimeRequest,
} from '@omnia/neurofrigo-runtime';

import { runSemanticSearch } from '../retrieval/search';
import { refreshNeurofrigoAiDashboard } from './dashboard';

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
  request: RuntimeRequest & { sessionId?: string | number | null },
): Promise<{ answer: RuntimeAnswer; sessionId: string | number }> {
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

  const runtime = new NeurofrigoRuntime({
    retrieval: {
      search: (query, subject) => runSemanticSearch(payload, query, subject),
    },
    llm: createLLMProvider(
      process.env as unknown as import('@omnia/neurofrigo-runtime').LlmFactoryEnv,
    ),
  });

  const answer = await runtime.ask({
    ...request,
    conversationHistory: history,
  });

  const nextTurn: ConversationTurn = {
    question: request.question,
    answer: answer.formattedText || answer.text,
    chunkIds: answer.sources.map((s) => s.chunkId),
    intent: answer.intent,
  };
  const turns = [...history, nextTurn].slice(-8);

  const data = {
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
    },
    user:
      request.identity.userId && /^\d+$/.test(String(request.identity.userId))
        ? Number(request.identity.userId)
        : undefined,
    tenant: request.identity.tenantId
      ? Number(request.identity.tenantId) || request.identity.tenantId
      : undefined,
    course: request.course.courseId
      ? Number(request.course.courseId) || request.course.courseId
      : undefined,
    module: request.course.moduleId
      ? Number(request.course.moduleId) || request.course.moduleId
      : undefined,
    lesson: request.course.lessonId
      ? Number(request.course.lessonId) || request.course.lessonId
      : undefined,
    ownerCompany: request.course.ownerCompanyId
      ? Number(request.course.ownerCompanyId) || request.course.ownerCompanyId
      : undefined,
  };

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
  return { answer, sessionId };
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
