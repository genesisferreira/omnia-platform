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
import { resolveDialogueTurn } from '../conversation/follow-up-resolver';
import { composeDialogueAnswer } from '../conversation/dialogue-compose';
import { applyStatePatch } from '../conversation/conversation-state';
import { applyRepetitionControl, naturalizeUserText } from '../conversation/naturalize-text';
import { validateAndRewriteResponse } from '../conversation/response-validator';
import { buildHandoffRequest } from '../conversation/action-router';
import { mergeRetrievalWithAuthorizedPassages } from '../context/authorized-passages';
import type { ConversationState } from '../conversation/dialogue-types';
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
  costPer1kTokens?: number | null;
};

/**
 * Experience runtime — Retrieval + Dialogue State (R5) + conversational synthesis.
 * Does not change ACL; only interprets authorized evidence + session memory.
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
    const authorizedPassages = request.domainContext?.authorizedPassages ?? null;
    const hasAuthorizedLessonContext = Boolean(authorizedPassages?.length);
    const previousAnswers = (request.conversationHistory || []).map((t) => t.answer);

    const resolved = resolveDialogueTurn({
      question: request.question,
      history: request.conversationHistory,
      persistedState: request.dialogueState,
      assistantKey,
      hasAuthorizedLessonContext,
    });

    // Capability meta-questions (no retrieval) — unless dialogue already handled affirmations.
    if (
      resolved.dialogueIntent === 'capabilities' ||
      (isCapabilityQuestion(request.question) && resolved.dialogueIntent === 'unknown')
    ) {
      const text = naturalizeUserText(
        buildCapabilityAnswer({
          assistantKey,
          assistantName: request.assistantMeta?.name,
          description: request.assistantMeta?.description,
          capabilities: request.assistantMeta?.capabilities,
          channel: request.channel,
        }),
      );
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: 1,
        sources: [],
        state: applyStatePatch(resolved.state, {
          currentIntent: 'capabilities',
          lastAssistantText: text,
          pendingOffer: null,
        }),
        dialogueIntent: 'capabilities',
        justification: 'Resposta de capacidades a partir do Assistant Registry (sem retrieval).',
        previousAnswers,
      });
    }

    // Dialogue-composed answers (clarification, catalog, recommendation, services map, contact, etc.)
    const composed = composeDialogueAnswer({
      dialogueIntent: resolved.dialogueIntent,
      state: resolved.state,
      publicCourses,
      clarificationText: resolved.clarificationText,
      evidenceTexts: [],
    });

    if (
      resolved.skipRetrieval &&
      (composed.text || resolved.clarificationText) &&
      resolved.dialogueIntent !== 'unknown'
    ) {
      let text = composed.text || resolved.clarificationText || '';
      text = applyRepetitionControl({
        candidate: text,
        previousAnswers,
        dialogueIntent: resolved.dialogueIntent,
      });
      const validated = validateAndRewriteResponse({
        text,
        catalogLevels: publicCourses?.map((c) => ({ title: c.title, level: c.level })),
      });
      text = validated.text;
      const pendingOffer = composed.pendingOffer;
      const handoff =
        resolved.dialogueIntent === 'contact_handoff' && resolved.state.handoffPrepared
          ? buildHandoffRequest({
              source: assistantKey || 'concierge',
              state: resolved.state,
              sessionId: request.sessionId,
              userId: request.identity.userId,
              tenantId: request.identity.tenantId,
            })
          : null;
      let pendingAction = resolved.state.pendingAction;
      if (pendingOffer?.options.length === 1 && pendingOffer.options[0] === 'confirm_handoff') {
        pendingAction = 'CONTACT_HANDOFF';
      } else if (resolved.dialogueIntent === 'course_recommendation') {
        pendingAction = 'COURSE_RECOMMENDATION';
      } else if (resolved.dialogueIntent === 'course_catalog') {
        pendingAction = 'COURSE_CATALOG';
      } else if (resolved.dialogueIntent === 'contact_handoff' && !resolved.state.handoffPrepared) {
        pendingAction = 'CONTACT_HANDOFF';
      }
      const state = applyStatePatch(resolved.state, {
        currentIntent: resolved.dialogueIntent,
        currentTopic: composed.topic,
        pendingOffer,
        pendingAction,
        lastAssistantText: text,
        lastAssistantQuestion: /\?/.test(text)
          ? text
              .split('\n')
              .filter((l) => l.includes('?'))
              .slice(-1)[0] || null
          : resolved.state.lastAssistantQuestion,
        selectedCourse:
          resolved.dialogueIntent === 'course_catalog' ||
          resolved.dialogueIntent === 'course_recommendation'
            ? publicCourses?.[0]?.title || resolved.state.selectedCourse
            : resolved.state.selectedCourse,
        currentCourse:
          publicCourses?.[0]?.title ||
          resolved.state.currentCourse ||
          resolved.state.selectedCourse,
        responsibleCompany:
          resolved.state.responsibleCompany ||
          resolved.state.selectedCompany ||
          resolved.state.currentCompany ||
          resolved.state.contactTarget ||
          null,
        contactTarget: resolved.state.contactTarget,
        selectedCompany: resolved.state.selectedCompany || resolved.state.responsibleCompany,
      });
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: resolved.decision === 'NEEDS_CLARIFICATION' ? 0.7 : 0.9,
        sources: [],
        state,
        dialogueIntent: resolved.dialogueIntent,
        justification: dialogueJustification(resolved.dialogueIntent),
        previousAnswers,
        handoffRequest: handoff,
      });
    }

    // Force services / institutional compose even when retrieval will run — prefer composed services.
    if (resolved.dialogueIntent === 'services' && !resolved.clarificationText) {
      const serviceCompose = composeDialogueAnswer({
        dialogueIntent: 'services',
        state: resolved.state,
        publicCourses,
      });
      let text = applyRepetitionControl({
        candidate: serviceCompose.text,
        previousAnswers,
        dialogueIntent: 'services',
      });
      text = naturalizeUserText(text);
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: 0.86,
        sources: [],
        state: applyStatePatch(resolved.state, {
          currentIntent: 'services',
          pendingOffer: serviceCompose.pendingOffer,
          lastAssistantText: text,
          activeEntity: 'service',
        }),
        dialogueIntent: 'services',
        justification:
          'Orientação de serviços do ecossistema Omnia com base no mapa institucional público.',
        previousAnswers,
      });
    }

    if (resolved.dialogueIntent === 'company_routing') {
      const companyCompose = composeDialogueAnswer({
        dialogueIntent: 'company_routing',
        state: resolved.state,
      });
      const text = naturalizeUserText(companyCompose.text);
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: 0.88,
        sources: [],
        state: applyStatePatch(resolved.state, {
          currentIntent: 'company_routing',
          pendingOffer: companyCompose.pendingOffer,
          lastAssistantText: text,
          responsibleCompany:
            resolved.state.responsibleCompany || resolved.state.selectedCompany || null,
          contactTarget: resolved.state.contactTarget,
          selectedCompany: resolved.state.selectedCompany || resolved.state.responsibleCompany,
          currentCompany: resolved.state.currentCompany || resolved.state.selectedCompany,
        }),
        dialogueIntent: 'company_routing',
        justification: 'Roteamento institucional público entre empresas do ecossistema.',
        previousAnswers,
      });
    }

    if (resolved.dialogueIntent === 'commercial_discovery') {
      const commercial = composeDialogueAnswer({
        dialogueIntent: 'commercial_discovery',
        state: resolved.state,
      });
      const text = naturalizeUserText(commercial.text);
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: 0.8,
        sources: [],
        state: applyStatePatch(resolved.state, {
          currentIntent: 'commercial_discovery',
          pendingOffer: commercial.pendingOffer,
          lastAssistantText: text,
        }),
        dialogueIntent: 'commercial_discovery',
        justification: 'Descoberta comercial multi-turn com qualificação de necessidade.',
        previousAnswers,
      });
    }

    if (resolved.dialogueIntent === 'engineering_troubleshooting') {
      // Tutor + authorized LMS lesson: fall through to retrieval/grounding path.
      if (!(assistantKey === 'tutor' && hasAuthorizedLessonContext)) {
        const eng = composeDialogueAnswer({
          dialogueIntent: 'engineering_troubleshooting',
          state: resolved.state,
          clarificationText: resolved.clarificationText,
        });
        const text = naturalizeUserText(eng.text);
        return this.finishDialogue({
          text,
          started,
          meta,
          intentHint,
          assistantKey,
          channel: request.channel,
          question: request.question,
          confidence: 0.82,
          sources: [],
          state: applyStatePatch(resolved.state, {
            currentIntent: 'engineering_troubleshooting',
            pendingOffer: eng.pendingOffer,
            lastAssistantText: text,
            contactTarget: resolved.state.contactTarget || 'technical',
            responsibleCompany: resolved.state.responsibleCompany || 'Renovação Refrigeração',
          }),
          dialogueIntent: 'engineering_troubleshooting',
          justification: 'Descoberta/diagnóstico de engenharia multi-turn — sem retrieval genérico.',
          previousAnswers,
        });
      }
    }

    // Teaching rephrase/example/check without requiring retrieval hit
    if (
      resolved.dialogueIntent === 'teaching_rephrase' ||
      resolved.dialogueIntent === 'teaching_example' ||
      resolved.dialogueIntent === 'teaching_check'
    ) {
      const teach = composeDialogueAnswer({
        dialogueIntent: resolved.dialogueIntent,
        state: resolved.state,
      });
      let text = applyRepetitionControl({
        candidate: teach.text,
        previousAnswers,
        dialogueIntent: resolved.dialogueIntent,
      });
      text = naturalizeUserText(text);
      return this.finishDialogue({
        text,
        started,
        meta,
        intentHint,
        assistantKey,
        channel: request.channel,
        question: request.question,
        confidence: 0.84,
        sources: [],
        state: applyStatePatch(resolved.state, {
          currentIntent: resolved.dialogueIntent,
          pendingOffer: teach.pendingOffer,
          lastAssistantText: text,
        }),
        dialogueIntent: resolved.dialogueIntent,
        justification: 'Adaptação pedagógica multi-turn (reexplicar / exemplo / verificação).',
        previousAnswers,
      });
    }

    // Retrieval path with effective question from dialogue resolver
    const retrievalQuestion = resolved.effectiveQuestion || request.question;
    const retrievalRequest: RuntimeRequest = {
      ...request,
      question: retrievalQuestion,
    };

    try {
      const retrievalStarted = Date.now();
      const retrieval = await withTimeout(
        this.retrieval.search(
          {
            text: this.buildRetrievalQuery(retrievalRequest, resolved.state),
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

      const merged = mergeRetrievalWithAuthorizedPassages(
        this.buildRetrievalQuery(retrievalRequest, resolved.state),
        retrieval.results,
        authorizedPassages,
      );

      const guarded = applyRetrievalGuardrails(
        this.buildRetrievalQuery(retrievalRequest, resolved.state),
        merged.chunks,
        this.limits,
        {
          assistantKey,
          channel: request.channel,
          courseId: context.courseId,
        },
      );

      if (!guarded.ok) {
        // Institutional overview can still be composed without hits if dialogue says so
        if (resolved.dialogueIntent === 'institutional_overview') {
          const inst = composeDialogueAnswer({
            dialogueIntent: 'institutional_overview',
            state: resolved.state,
            evidenceTexts: [],
          });
          const text = naturalizeUserText(inst.text);
          return this.finishDialogue({
            text,
            started,
            meta,
            intentHint,
            assistantKey,
            channel: request.channel,
            question: request.question,
            confidence: 0.75,
            sources: [],
            state: applyStatePatch(resolved.state, {
              currentIntent: 'institutional_overview',
              pendingOffer: inst.pendingOffer,
              lastAssistantText: text,
              activeEntity: 'omnia',
            }),
            dialogueIntent: 'institutional_overview',
            justification: 'Visão institucional pública do ecossistema Omnia.',
            previousAnswers,
          });
        }

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
          suggestedActions: buildSuggestedActions({
            assistantKey,
            channel: request.channel,
            question: request.question,
            status: 'not_found',
            intent: resolved.dialogueIntent,
            hasSources: false,
          }),
          dialogueState: resolved.state,
          dialogueIntent: resolved.dialogueIntent,
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

      // Prefer dialogue compose for institutional when we have evidence
      if (resolved.dialogueIntent === 'institutional_overview') {
        const inst = composeDialogueAnswer({
          dialogueIntent: 'institutional_overview',
          state: resolved.state,
          evidenceTexts: guarded.chunks.map((c) => c.text),
        });
        let text = applyRepetitionControl({
          candidate: inst.text,
          previousAnswers,
          dialogueIntent: 'institutional_overview',
        });
        text = naturalizeUserText(text);
        const sources = guarded.chunks.map((c) => ({
          chunkId: c.chunkId,
          text: c.text,
          score: c.score,
          similarity: c.similarity,
          citation: c.citation,
        }));
        return this.finishDialogue({
          text,
          started,
          meta,
          intentHint,
          assistantKey,
          channel: request.channel,
          question: request.question,
          confidence: normalizeConfidence(computeConfidence(guarded.chunks)) ?? 0.8,
          sources,
          state: applyStatePatch(resolved.state, {
            currentIntent: 'institutional_overview',
            pendingOffer: inst.pendingOffer,
            lastAssistantText: text,
            activeEntity: 'omnia',
          }),
          dialogueIntent: 'institutional_overview',
          justification: humanExplainability({
            assistantKey,
            channel: request.channel,
            sourceCount: sources.length,
          }),
          previousAnswers,
          retrievalMeta: {
            candidateCount: retrieval.candidateCount,
            afterAclCount: retrieval.afterAclCount,
            recoveredTokens: retrieval.recoveredTokens,
            tookMs: retrieval.tookMs,
            llmTookMs: 0,
          },
        });
      }

      const prompt = this.promptBuilder.build({
        question: retrievalQuestion,
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
      if (looksLikeInternalLeak(answerText)) {
        answerText = synthesizeConversationalAnswer({
          question: retrievalQuestion,
          evidence: sources.map((s) => ({ id: s.chunkId, text: s.text })),
          intent: prompt.intent,
          assistantKey,
          channel: request.channel,
          publicCourses,
          history: request.conversationHistory,
        });
      }
      answerText = applyRepetitionControl({
        candidate: answerText,
        previousAnswers,
        dialogueIntent: resolved.dialogueIntent,
      });
      answerText = naturalizeUserText(answerText);

      const confidence = normalizeConfidence(computeConfidence(guarded.chunks));
      const contextChars = guarded.chunks.reduce((s, c) => s + c.text.length, 0);
      const grounding = computeGroundingScore({
        chunks: guarded.chunks,
        confidence: confidence ?? 0,
        contextChars,
      });

      const pendingOffer =
        resolved.dialogueIntent === 'teaching'
          ? composeDialogueAnswer({
              dialogueIntent: 'teaching_example',
              state: resolved.state,
            }).pendingOffer
          : resolved.state.pendingOffer;

      const state = applyStatePatch(resolved.state, {
        lastAssistantText: answerText,
        pendingOffer,
        tutorConcept: resolved.dialogueIntent.startsWith('teaching')
          ? resolved.state.tutorConcept || request.course.lessonTitle || 'conceito da aula'
          : resolved.state.tutorConcept,
      });

      return {
        text: answerText,
        formattedText: formatResponse({
          text: answerText,
          intent: prompt.intent,
          status: 'ok',
        }),
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
        suggestedActions: buildSuggestedActions({
          assistantKey,
          channel: request.channel,
          question: request.question,
          status: 'ok',
          intent: resolved.dialogueIntent,
          hasSources: sources.length > 0,
          conversationKind: resolved.dialogueIntent,
        }),
        dialogueState: state,
        dialogueIntent: resolved.dialogueIntent,
        explainability: {
          sourceCount: sources.length,
          avgScore: Number(
            (sources.reduce((s, x) => s + x.score, 0) / Math.max(1, sources.length)).toFixed(3),
          ),
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
      const isRetrieval =
        !isTimeout &&
        (/retrieval|vector|embedding|ECONNREFUSED|ENOTFOUND|fetch failed|404|502|503/i.test(
          message,
        ) ||
          /RETRIEVAL_/i.test(message));
      const text = isTimeout
        ? 'A solicitação excedeu o tempo limite. Tente novamente.'
        : isRetrieval
          ? 'Não foi possível consultar o conhecimento autorizado agora. Tente novamente em instantes.'
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
        errorCode: isTimeout ? 'TIMEOUT' : isRetrieval ? 'RETRIEVAL_ERROR' : 'RUNTIME_ERROR',
        intent: intentHint,
        grounding: null,
        suggestedActions: [],
        dialogueState: resolved.state,
        dialogueIntent: resolved.dialogueIntent,
        explainability: null,
      };
    }
  }

  private finishDialogue(input: {
    text: string;
    started: number;
    meta: { model: string; name: string };
    intentHint: RuntimeAnswer['intent'];
    assistantKey: string | null;
    channel?: string | null;
    question: string;
    confidence: number;
    sources: RuntimeAnswer['sources'];
    state: ConversationState;
    dialogueIntent: string;
    justification: string;
    previousAnswers: string[];
    retrievalMeta?: RuntimeAnswer['retrieval'];
    handoffRequest?: RuntimeAnswer['handoffRequest'];
  }): RuntimeAnswer {
    const validated = validateAndRewriteResponse({ text: input.text });
    const text = validated.text;
    const suggestedActions = buildSuggestedActions({
      assistantKey: input.assistantKey,
      channel: input.channel,
      question: input.question,
      status: 'ok',
      intent: input.dialogueIntent,
      hasSources: input.sources.length > 0,
      conversationKind: input.dialogueIntent,
    });
    return {
      text,
      formattedText: formatResponse({
        text,
        intent: input.intentHint,
        status: 'ok',
      }),
      sources: input.sources,
      confidence: normalizeConfidence(input.confidence),
      tookMs: Date.now() - input.started,
      model: input.meta.model,
      provider: input.meta.name,
      promptTokens: 0,
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil(text.length / 4),
      estimatedCostUsd: 0,
      status: 'ok',
      errorCode: null,
      intent: input.intentHint,
      grounding:
        input.sources.length > 0
          ? computeGroundingScore({
              chunks: input.sources.map((s) => ({
                chunkId: s.chunkId,
                text: s.text,
                score: s.score,
                similarity: s.similarity,
                tokenEstimate: Math.ceil(s.text.length / 4),
                language: 'pt-BR',
                tags: [],
                citation: s.citation,
              })),
              confidence: input.confidence,
              contextChars: input.sources.reduce((n, s) => n + s.text.length, 0),
            })
          : null,
      suggestedActions,
      dialogueState: input.state,
      dialogueIntent: input.dialogueIntent,
      handoffRequest: input.handoffRequest ?? null,
      explainability: {
        sourceCount: input.sources.length,
        avgScore: input.sources.length
          ? Number(
              (input.sources.reduce((s, x) => s + x.score, 0) / input.sources.length).toFixed(3),
            )
          : 0,
        confidence: normalizeConfidence(input.confidence),
        documents: input.sources.map((s) => ({
          chunkId: s.chunkId,
          knowledgeDocumentId: s.citation.knowledgeDocumentId,
          learningResourceId: s.citation.learningResourceId,
          page: s.citation.page,
          score: s.score,
          similarity: s.similarity,
        })),
        retrievalTookMs: input.retrievalMeta?.tookMs ?? 0,
        llmTookMs: input.retrievalMeta?.llmTookMs ?? 0,
        intent: input.intentHint || 'explanation',
        justification: input.justification,
      },
      retrieval: input.retrievalMeta,
    };
  }

  private buildRetrievalQuery(request: RuntimeRequest, state?: ConversationState | null): string {
    const history = request.conversationHistory ?? [];
    const topic = state?.currentTopic || state?.currentIntent || '';
    const entity = state?.activeEntity || '';
    if (!history.length) {
      return topic ? `${request.question}\n(tópico: ${topic} ${entity})` : request.question;
    }
    const recent = history.slice(-2);
    const ctx = recent
      .map((t) => `${t.question}${t.answer ? ` → ${t.answer.slice(0, 120)}` : ''}`)
      .join(' | ');
    return `${request.question}\n(contexto da sessão: ${ctx}; tópico: ${topic}; entidade: ${entity})`;
  }
}

function dialogueJustification(intent: string): string {
  switch (intent) {
    case 'course_catalog':
      return 'Resposta a partir do catálogo público de cursos publicados.';
    case 'course_recommendation':
      return 'Recomendação de curso com qualificação do perfil do usuário.';
    case 'services':
      return 'Mapa de serviços do ecossistema Omnia.';
    case 'clarification':
    case 'affirmation_orphan':
      return 'Esclarecimento conversacional antes de recuperar conteúdo.';
    default:
      return 'Resposta conversacional com continuidade de sessão.';
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
  return `Esta resposta foi elaborada com base no conteúdo autorizado disponível para este assistente${
    input.sourceCount ? ` (${input.sourceCount} fonte${input.sourceCount > 1 ? 's' : ''})` : ''
  }.`;
}
