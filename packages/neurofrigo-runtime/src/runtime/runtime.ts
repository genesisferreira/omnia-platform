import type { RuntimeAnswer, RuntimeRequest, GuardrailLimits } from '../domain/types';
import { DEFAULT_GUARDRAIL_LIMITS } from '../domain/types';
import { buildCapabilityAnswer, isCapabilityQuestion } from '../domain/capability-response';
import { ContextBuilder } from '../context/context-builder';
import { PromptBuilder } from '../prompt/prompt-builder';
import { formatResponse } from '../formatter/response-formatter';
import { computeGroundingScore } from '../quality/grounding-score';
import { classifyIntent } from '../intent/classify-intent';
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
  /** Custo estimado do Model Registry ($ / 1k tokens). */
  costPer1kTokens?: number | null;
};

/**
 * Orquestrador Experience V2 — ports only; sem Payload/pgvector.
 */
export class NeurofrigoRuntime {
  private readonly retrieval: RetrievalPort;
  private readonly llm: LLMProviderPort;
  private readonly contextBuilder: ContextBuilderPort;
  private readonly promptBuilder: PromptBuilderPort;
  private readonly limits: GuardrailLimits;
  private readonly costPer1kTokens: number | null;

  constructor(deps: NeurofrigoRuntimeDeps) {
    this.retrieval = deps.retrieval;
    this.llm = deps.llm;
    this.contextBuilder = deps.contextBuilder ?? new ContextBuilder();
    this.promptBuilder = deps.promptBuilder ?? new PromptBuilder();
    this.limits = { ...DEFAULT_GUARDRAIL_LIMITS, ...deps.limits };
    this.costPer1kTokens = deps.costPer1kTokens ?? null;
  }

  async ask(request: RuntimeRequest): Promise<RuntimeAnswer> {
    const started = Date.now();
    const context = this.contextBuilder.build(request);
    const meta = this.llm.metadata();
    const intentHint = classifyIntent(request.question);
    const assistantKey = request.assistantKey ?? null;

    if (isCapabilityQuestion(request.question)) {
      const text = buildCapabilityAnswer({
        assistantKey,
        assistantName: request.assistantMeta?.name,
        description: request.assistantMeta?.description,
        capabilities: request.assistantMeta?.capabilities,
        channel: request.channel,
      });
      const formatted = formatResponse({
        text,
        intent: intentHint,
        status: 'ok',
      });
      return {
        text,
        formattedText: formatted,
        sources: [],
        confidence: 1,
        tookMs: Date.now() - started,
        model: meta.model,
        provider: meta.name,
        promptTokens: 0,
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil(text.length / 4),
        estimatedCostUsd: 0,
        status: 'ok',
        errorCode: null,
        intent: intentHint,
        grounding: null,
        explainability: {
          sourceCount: 0,
          avgScore: 0,
          confidence: 1,
          documents: [],
          retrievalTookMs: 0,
          llmTookMs: 0,
          intent: intentHint,
          justification: 'Resposta de capacidades a partir do Assistant Registry (sem retrieval).',
        },
      };
    }

    try {
      const retrievalStarted = Date.now();
      const retrieval = await withTimeout(
        this.retrieval.search(
          {
            text: this.buildRetrievalQuery(request),
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
            channel: request.channel || 'portal_chat',
            role: context.role,
            userId: context.userId,
            tenantId: context.tenantId,
            companyIds: context.companyIds,
            agentKey: assistantKey,
          },
        ),
        this.limits.timeoutMs,
      );
      const retrievalTookMs = Date.now() - retrievalStarted;

      const guarded = applyRetrievalGuardrails(
        this.buildRetrievalQuery(request),
        retrieval.results,
        this.limits,
        {
          assistantKey,
          channel: request.channel,
          courseId: context.courseId,
        },
      );

      if (!guarded.ok) {
        const formatted = formatResponse({
          text: guarded.message,
          intent: intentHint,
          status: 'not_found',
        });
        return {
          text: guarded.message,
          formattedText: formatted,
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
          intent: intentHint,
          grounding: computeGroundingScore({
            chunks: [],
            confidence: 0,
            contextChars: 0,
          }),
          explainability: {
            sourceCount: 0,
            avgScore: 0,
            confidence: 0,
            documents: [],
            retrievalTookMs,
            llmTookMs: 0,
            intent: intentHint,
            justification:
              'Nenhuma fonte autorizada atingiu o limiar de relevância para esta pergunta.',
          },
          retrieval: {
            candidateCount: retrieval.candidateCount,
            afterAclCount: retrieval.afterAclCount,
            recoveredTokens: retrieval.recoveredTokens,
            tookMs: retrieval.tookMs,
            llmTookMs: 0,
          },
        };
      }

      const prompt = this.promptBuilder.build({
        question: request.question,
        context,
        chunks: guarded.chunks,
        limits: this.limits,
      });

      const llmStarted = Date.now();
      const completion = await withTimeout(
        this.llm.complete({
          system: prompt.system,
          user: prompt.user,
          maxTokens: this.limits.maxCompletionTokens,
          temperature: 0.2,
        }),
        Math.max(1000, this.limits.timeoutMs - (Date.now() - started)),
      );
      const llmTookMs = Date.now() - llmStarted;

      const sources = guarded.chunks.map((c) => ({
        chunkId: c.chunkId,
        text: c.text,
        score: c.score,
        similarity: c.similarity,
        citation: c.citation,
      }));

      const confidence = computeConfidence(guarded.chunks);
      const contextChars = guarded.chunks.reduce((s, c) => s + c.text.length, 0);
      const grounding = computeGroundingScore({
        chunks: guarded.chunks,
        confidence,
        contextChars,
      });
      const avgScore = sources.reduce((s, x) => s + x.score, 0) / Math.max(1, sources.length);

      const formattedText = formatResponse({
        text: completion.text,
        intent: prompt.intent,
        status: 'ok',
      });

      return {
        text: completion.text,
        formattedText,
        sources,
        confidence,
        tookMs: Date.now() - started,
        model: completion.model || meta.model,
        provider: completion.provider || meta.name,
        promptTokens: completion.promptTokens || prompt.estimatedPromptTokens,
        completionTokens: completion.completionTokens,
        totalTokens:
          completion.totalTokens || completion.promptTokens + completion.completionTokens,
        estimatedCostUsd: estimateCostUsd(
          completion.totalTokens || completion.promptTokens + completion.completionTokens,
          completion.provider || meta.name,
          this.costPer1kTokens,
        ),
        status: 'ok',
        errorCode: null,
        intent: prompt.intent,
        grounding,
        explainability: {
          sourceCount: sources.length,
          avgScore: Number(avgScore.toFixed(3)),
          confidence,
          documents: sources.map((s) => ({
            chunkId: s.chunkId,
            knowledgeDocumentId: s.citation.knowledgeDocumentId,
            learningResourceId: s.citation.learningResourceId,
            page: s.citation.page,
            score: s.score,
            similarity: s.similarity,
          })),
          retrievalTookMs,
          llmTookMs,
          intent: prompt.intent,
          justification: `Resposta ancorada em ${sources.length} trecho(s) do material autorizado (score médio ${avgScore.toFixed(2)}, grounding ${grounding.score.toFixed(2)}).`,
        },
        retrieval: {
          candidateCount: retrieval.candidateCount,
          afterAclCount: retrieval.afterAclCount,
          recoveredTokens: retrieval.recoveredTokens,
          tookMs: retrieval.tookMs,
          llmTookMs,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'runtime_error';
      const isTimeout = message === 'TIMEOUT' || /timeout/i.test(message);
      const text = isTimeout
        ? 'A solicitação excedeu o tempo limite. Tente novamente.'
        : 'Ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.';
      return {
        text,
        formattedText: formatResponse({
          text,
          intent: intentHint,
          status: isTimeout ? 'timeout' : 'error',
        }),
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
        errorCode: isTimeout
          ? 'TIMEOUT'
          : `RUNTIME_ERROR:${message.replace(/\s+/g, ' ').slice(0, 160)}`,
        intent: intentHint,
        grounding: null,
        explainability: null,
      };
    }
  }

  /** Inclui leve reforço do último turno para follow-up sem mudar o Retriever. */
  private buildRetrievalQuery(request: RuntimeRequest): string {
    const history = request.conversationHistory ?? [];
    if (!history.length) return request.question;
    const last = history[history.length - 1]!;
    return `${request.question}\n(contexto da sessão: ${last.question})`;
  }
}
