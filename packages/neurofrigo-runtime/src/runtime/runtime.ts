import type { RuntimeAnswer, RuntimeRequest, GuardrailLimits } from '../domain/types';
import { DEFAULT_GUARDRAIL_LIMITS } from '../domain/types';
import { ContextBuilder } from '../context/context-builder';
import { PromptBuilder } from '../prompt/prompt-builder';
import {
  applyRetrievalGuardrails,
  computeConfidence,
  estimateCostUsd,
  withTimeout,
} from '../guardrails';
import type {
  ContextBuilderPort,
  LLMProviderPort,
  PromptBuilderPort,
  RetrievalPort,
} from '../ports';

export type NeurofrigoRuntimeDeps = {
  retrieval: RetrievalPort;
  llm: LLMProviderPort;
  contextBuilder?: ContextBuilderPort;
  promptBuilder?: PromptBuilderPort;
  limits?: Partial<GuardrailLimits>;
};

/**
 * Orquestrador MVP — não acessa Payload/pgvector/banco.
 */
export class NeurofrigoRuntime {
  private readonly retrieval: RetrievalPort;
  private readonly llm: LLMProviderPort;
  private readonly contextBuilder: ContextBuilderPort;
  private readonly promptBuilder: PromptBuilderPort;
  private readonly limits: GuardrailLimits;

  constructor(deps: NeurofrigoRuntimeDeps) {
    this.retrieval = deps.retrieval;
    this.llm = deps.llm;
    this.contextBuilder = deps.contextBuilder ?? new ContextBuilder();
    this.promptBuilder = deps.promptBuilder ?? new PromptBuilder();
    this.limits = { ...DEFAULT_GUARDRAIL_LIMITS, ...deps.limits };
  }

  async ask(request: RuntimeRequest): Promise<RuntimeAnswer> {
    const started = Date.now();
    const context = this.contextBuilder.build(request);
    const meta = this.llm.metadata();

    try {
      const retrieval = await withTimeout(
        this.retrieval.search(
          {
            text: request.question,
            tenantId: context.tenantId,
            userId: context.userId,
            ownerCompanyId: context.ownerCompanyId,
            courseId: context.courseId,
            lessonId: context.lessonId,
            moduleId: context.moduleId,
            language: context.language,
            topK: request.topK ?? this.limits.maxContextChunks,
          },
          {
            channel: 'portal_chat',
            role: context.role,
            userId: context.userId,
            tenantId: context.tenantId,
            companyIds: context.companyIds,
          },
        ),
        this.limits.timeoutMs,
      );

      const guarded = applyRetrievalGuardrails(
        request.question,
        retrieval.results,
        this.limits,
      );

      if (!guarded.ok) {
        return {
          text: guarded.message,
          sources: [],
          confidence: 0,
          tookMs: Date.now() - started,
          model: meta.model,
          provider: meta.name,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          status: 'not_found',
          errorCode: guarded.code,
          retrieval: {
            candidateCount: retrieval.candidateCount,
            afterAclCount: retrieval.afterAclCount,
            recoveredTokens: retrieval.recoveredTokens,
            tookMs: retrieval.tookMs,
          },
        };
      }

      const prompt = this.promptBuilder.build({
        question: request.question,
        context,
        chunks: guarded.chunks,
        limits: this.limits,
      });

      const completion = await withTimeout(
        this.llm.complete({
          system: prompt.system,
          user: prompt.user,
          maxTokens: this.limits.maxCompletionTokens,
          temperature: 0.2,
        }),
        Math.max(1000, this.limits.timeoutMs - (Date.now() - started)),
      );

      const sources = guarded.chunks.map((c) => ({
        chunkId: c.chunkId,
        text: c.text,
        score: c.score,
        similarity: c.similarity,
        citation: c.citation,
      }));

      return {
        text: completion.text,
        sources,
        confidence: computeConfidence(guarded.chunks),
        tookMs: Date.now() - started,
        model: completion.model || meta.model,
        provider: completion.provider || meta.name,
        promptTokens: completion.promptTokens || prompt.estimatedPromptTokens,
        completionTokens: completion.completionTokens,
        totalTokens:
          completion.totalTokens ||
          completion.promptTokens + completion.completionTokens,
        estimatedCostUsd: estimateCostUsd(
          completion.totalTokens || completion.promptTokens + completion.completionTokens,
          completion.provider || meta.name,
        ),
        status: 'ok',
        errorCode: null,
        retrieval: {
          candidateCount: retrieval.candidateCount,
          afterAclCount: retrieval.afterAclCount,
          recoveredTokens: retrieval.recoveredTokens,
          tookMs: retrieval.tookMs,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'runtime_error';
      const isTimeout = message === 'TIMEOUT' || /timeout/i.test(message);
      return {
        text: isTimeout
          ? 'A solicitação excedeu o tempo limite. Tente novamente.'
          : 'Ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.',
        sources: [],
        confidence: 0,
        tookMs: Date.now() - started,
        model: meta.model,
        provider: meta.name,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        status: isTimeout ? 'timeout' : 'error',
        errorCode: isTimeout ? 'TIMEOUT' : 'RUNTIME_ERROR',
      };
    }
  }
}
