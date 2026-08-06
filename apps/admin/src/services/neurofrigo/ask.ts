import type { Payload } from 'payload';
import {
  NeurofrigoRuntime,
  createLLMProvider,
  type RuntimeAnswer,
  type RuntimeRequest,
} from '@omnia/neurofrigo-runtime';

import { runSemanticSearch } from '../retrieval/search';
import { refreshNeurofrigoAiDashboard } from './dashboard';

export async function runNeurofrigoAsk(
  payload: Payload,
  request: RuntimeRequest,
): Promise<{ answer: RuntimeAnswer; sessionId: string | number }> {
  const runtime = new NeurofrigoRuntime({
    retrieval: {
      search: (query, subject) => runSemanticSearch(payload, query, subject),
    },
    llm: createLLMProvider(process.env as unknown as import('@omnia/neurofrigo-runtime').LlmFactoryEnv),
  });

  const answer = await runtime.ask(request);

  const session = await payload.create({
    collection: 'ai-sessions',
    data: {
      question: request.question,
      answerText: answer.text,
      status: answer.status,
      provider: answer.provider,
      model: answer.model,
      tookMs: answer.tookMs,
      promptTokens: answer.promptTokens,
      completionTokens: answer.completionTokens,
      totalTokens: answer.totalTokens,
      estimatedCostUsd: answer.estimatedCostUsd,
      confidence: answer.confidence,
      errorCode: answer.errorCode ?? null,
      sources: answer.sources,
      filters: {
        course: request.course,
        identity: {
          userId: request.identity.userId ?? null,
          role: request.identity.role ?? null,
          tenantId: request.identity.tenantId ?? null,
        },
      },
      user: request.identity.userId
        ? Number(request.identity.userId) || request.identity.userId
        : undefined,
      tenant: request.identity.tenantId
        ? Number(request.identity.tenantId) || request.identity.tenantId
        : undefined,
      course: request.course.courseId
        ? Number(request.course.courseId) || request.course.courseId
        : undefined,
      lesson: request.course.lessonId
        ? Number(request.course.lessonId) || request.course.lessonId
        : undefined,
      ownerCompany: request.course.ownerCompanyId
        ? Number(request.course.ownerCompanyId) || request.course.ownerCompanyId
        : undefined,
    },
    overrideAccess: true,
    context: { neurofrigoRuntimeActive: true },
  });

  await refreshNeurofrigoAiDashboard(payload).catch(() => undefined);

  return { answer, sessionId: session.id };
}
