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
import { normalizeConfidence } from '../conversation/normalize-confidence';
import { buildSuggestedActions } from '../conversation/suggested-actions';
import { synthesizeConversationalAnswer } from '../conversation/synthesize-answer';
import { looksLikeInternalLeak } from '../conversation/sanitize-evidence';
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
 * Orquestrador Experience V2 — Conversation Layer sobre Retrieval + LLM.
 * Não altera ACL: só sintetiza evidência já autorizada.
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
    const publicCourses = request.domainContext?.publicCourses ?? null;

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
      const suggestedActions = buildSuggestedActions({
        assistantKey,
        channel: request.channel,
        question: request.question,
        status: 'ok',
        intent: intentHint,
        hasSources: false,
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
        suggestedActions,
        explainability: {
          sourceCount: 0,
          avgScore: 0,
          confidence: 1,
          documents: [],
          retrievalTookMs: 0,
          llmTookMs: 0,
          intent: intentHint,
          justification:
            'Esta resposta descreve o que o assistente pode fazer, com base no perfil e nas capacidades publicadas — sem consulta à base documental.',
        },
      };
    }

    // Course discovery with live LMS catalog — prefer catalog over pure RAG dump.
    if (
      publicCourses &&
      publicCourses.length > 0 &&
      /quais?\s+cursos|que\s+cursos|cursos\s+voc[eê]s|oferecem?\s+cursos|cat[aá]logo/i.test(
        request.question,
      )
    ) {
      const text = synthesizeConversationalAnswer({
        question: request.question,
        evidence: [],
        intent: intentHint,
        assistantKey,
        channel: request.channel,
        publicCourses,
        history: request.conversationHistory,
      });
      const suggestedActions = buildSuggestedActions({
        assistantKey,
        channel: request.channel,
        question: request.question,
        status: 'ok',
        intent: intentHint,
        hasSources: false,
      });
      return {
        text,
        formattedText: formatResponse({ text, intent: intentHint, status: 'ok' }),
        sources: [],
        confidence: 0.9,
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
        suggestedActions,
        explainability: {
          sourceCount: 0,
          avgScore: 0,
          confidence: 0.9,
          documents: [],
          retrievalTookMs: 0,
          llmTookMs: 0,
          intent: intentHint,
          justification:
            'Esta resposta foi elaborada a partir do catálogo público de cursos publicados na plataforma Omnia.',
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
        // Follow-up with catalog still available
        if (
          publicCourses?.length &&
          /iniciante|melhor|quem\s+oferece|e\s+quem|quanto\s+tempo/i.test(request.question)
        ) {
          const text = synthesizeConversationalAnswer({
            question: request.question,
            evidence: [],
            intent: intentHint,
            assistantKey,
            channel: request.channel,
            publicCourses,
            history: request.conversationHistory,
          });
          if (text && !/não encontrei/i.test(text)) {
            return this.okSynthetic({
              text,
              intent: intentHint,
              started,
              meta,
              assistantKey,
              channel: request.channel,
              question: request.question,
              confidence: 0.85,
              justification:
                'Resposta de continuidade com base no catálogo público e no histórico da sessão.',
            });
          }
        }

        const formatted = formatResponse({
          text: guarded.message,
          intent: intentHint,
          status: 'not_found',
        });
        const suggestedActions = buildSuggestedActions({
          assistantKey,
          channel: request.channel,
          question: request.question,
          status: 'not_found',
          intent: intentHint,
          hasSources: false,
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
          suggestedActions,
          explainability: {
            sourceCount: 0,
            avgScore: 0,
            confidence: 0,
            documents: [],
            retrievalTookMs,
            llmTookMs: 0,
            intent: intentHint,
            justification:
              'Não havia conteúdo autorizado suficientemente relevante para esta pergunta.',
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
        assistantKey,
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

      let answerText = completion.text;
      // Safety net: if provider still leaks internals, re-synthesize.
      if (looksLikeInternalLeak(answerText)) {
        answerText = synthesizeConversationalAnswer({
          question: request.question,
          evidence: sources.map((s) => ({ id: s.chunkId, text: s.text })),
          intent: prompt.intent,
          assistantKey,
          channel: request.channel,
          publicCourses,
          history: request.conversationHistory,
        });
      }

      const confidence = normalizeConfidence(computeConfidence(guarded.chunks));
      const contextChars = guarded.chunks.reduce((s, c) => s + c.text.length, 0);
      const grounding = computeGroundingScore({
        chunks: guarded.chunks,
        confidence: confidence ?? 0,
        contextChars,
      });
      const avgScore = sources.reduce((s, x) => s + x.score, 0) / Math.max(1, sources.length);

      const formattedText = formatResponse({
        text: answerText,
        intent: prompt.intent,
        status: 'ok',
      });

      const suggestedActions = buildSuggestedActions({
        assistantKey,
        channel: request.channel,
        question: request.question,
        status: 'ok',
        intent: prompt.intent,
        hasSources: sources.length > 0,
      });

      return {
        text: answerText,
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
        suggestedActions,
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
          justification: humanExplainability({
            assistantKey,
            channel: request.channel,
            sourceCount: sources.length,
          }),
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
        confidence: null,
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
        suggestedActions: [],
        explainability: null,
      };
    }
  }

  private okSynthetic(input: {
    text: string;
    intent: RuntimeAnswer['intent'];
    started: number;
    meta: { model: string; name: string };
    assistantKey: string | null;
    channel?: string | null;
    question: string;
    confidence: number;
    justification: string;
  }): RuntimeAnswer {
    const suggestedActions = buildSuggestedActions({
      assistantKey: input.assistantKey,
      channel: input.channel,
      question: input.question,
      status: 'ok',
      intent: input.intent,
      hasSources: false,
    });
    return {
      text: input.text,
      formattedText: formatResponse({
        text: input.text,
        intent: input.intent,
        status: 'ok',
      }),
      sources: [],
      confidence: normalizeConfidence(input.confidence),
      tookMs: Date.now() - input.started,
      model: input.meta.model,
      provider: input.meta.name,
      promptTokens: 0,
      completionTokens: Math.ceil(input.text.length / 4),
      totalTokens: Math.ceil(input.text.length / 4),
      estimatedCostUsd: 0,
      status: 'ok',
      errorCode: null,
      intent: input.intent,
      grounding: null,
      suggestedActions,
      explainability: {
        sourceCount: 0,
        avgScore: 0,
        confidence: normalizeConfidence(input.confidence),
        documents: [],
        retrievalTookMs: 0,
        llmTookMs: 0,
        intent: input.intent || 'explanation',
        justification: input.justification,
      },
    };
  }

  /** Inclui reforço do histórico recente para follow-up sem mudar o Retriever. */
  private buildRetrievalQuery(request: RuntimeRequest): string {
    const history = request.conversationHistory ?? [];
    if (!history.length) return request.question;
    const recent = history.slice(-2);
    const ctx = recent
      .map((t) => `${t.question}${t.answer ? ` → ${t.answer.slice(0, 160)}` : ''}`)
      .join(' | ');
    return `${request.question}\n(contexto da sessão: ${ctx})`;
  }
}

function humanExplainability(input: {
  assistantKey?: string | null;
  channel?: string | null;
  sourceCount: number;
}): string {
  const isPublic =
    input.channel === 'portal_public' || (input.assistantKey || '').toLowerCase() === 'concierge';
  if (isPublic) {
    return `Esta resposta foi elaborada com base em conteúdos institucionais públicos da Omnia Frigo${
      input.sourceCount
        ? ` (${input.sourceCount} trecho${input.sourceCount > 1 ? 's' : ''} autorizado${input.sourceCount > 1 ? 's' : ''})`
        : ''
    } e nas informações disponíveis para este assistente.`;
  }
  if ((input.assistantKey || '').toLowerCase() === 'tutor') {
    return `Esta resposta foi elaborada com base no material autorizado do curso/aula disponível para o seu perfil${
      input.sourceCount ? ` (${input.sourceCount} fonte${input.sourceCount > 1 ? 's' : ''})` : ''
    }.`;
  }
  return `Esta resposta foi elaborada com base no conteúdo autorizado disponível para este assistente${
    input.sourceCount ? ` (${input.sourceCount} fonte${input.sourceCount > 1 ? 's' : ''})` : ''
  }.`;
}
