import type { SipAssistantContext } from '@omnia/student-intelligence';

import { buildAdaptivePlan, decideNextActions } from '../engine/decision-engine';
import { resolveAdaptivePolicy } from '../policy/resolve';
import type {
  AdaptiveDecideRequest,
  AdaptiveDecideResult,
  AdaptiveDecisionRepositoryPort,
  CatalogPort,
  SipContextPort,
} from '../domain/types';

export type AdaptiveLearningServiceDeps = {
  sip: SipContextPort;
  catalog: CatalogPort;
  decisions?: AdaptiveDecisionRepositoryPort;
};

/**
 * AdaptiveLearningService — orquestra Profile Service (SIP) + Decision Engine.
 * Não escreve no SIP; não acessa banco.
 */
export class AdaptiveLearningService {
  constructor(private readonly deps: AdaptiveLearningServiceDeps) {}

  async decide(request: AdaptiveDecideRequest): Promise<AdaptiveDecideResult> {
    const policy = resolveAdaptivePolicy(request.policy);
    const [sip, insights, progress, catalog] = await Promise.all([
      this.deps.sip.getContext({
        userKey: request.userKey,
        courseId: request.courseId,
      }),
      this.deps.sip.getInsights({
        userKey: request.userKey,
        courseId: request.courseId,
      }),
      this.deps.sip.getProgress({
        userKey: request.userKey,
        courseId: request.courseId,
      }),
      this.deps.catalog.load(request.courseId),
    ]);

    if (!sip) {
      const emptyCtx: SipAssistantContext = {
        userKey: request.userKey,
        technicalLevel: 'beginner',
        topCompetencies: [],
        gaps: [],
        preferences: [],
        goals: [],
        nextSteps: [],
        summaryText: '',
        confidence: 0,
        computedAt: request.now || new Date().toISOString(),
      };
      const actions = decideNextActions({
        snapshot: {
          userKey: request.userKey,
          courseId: request.courseId,
          sip: emptyCtx,
          insights: null,
          progressPercent: 0,
          completedLessonIds: [],
          completedModuleIds: [],
          evidenceCount: 0,
          difficultyTopics: [],
          pendingTopics: [],
          assessmentAvailable: Boolean(request.assessmentAvailable),
          lastActivityAt: null,
        },
        catalog,
        policy,
        now: request.now,
      });
      const plan = buildAdaptivePlan({
        userKey: request.userKey,
        courseId: request.courseId,
        actions,
        policy,
        now: request.now,
      });
      return { nextBest: plan.nextBest, actions, plan, policy };
    }

    const snapshot = {
      userKey: request.userKey,
      courseId: request.courseId,
      sip,
      insights,
      progressPercent: progress?.progressPercent ?? 0,
      completedLessonIds: progress?.completedLessonIds ?? [],
      completedModuleIds: progress?.completedModuleIds ?? [],
      evidenceCount: progress?.evidenceCount ?? 0,
      difficultyTopics: progress?.difficultyTopics ?? [],
      pendingTopics: progress?.pendingTopics ?? [],
      assessmentAvailable: Boolean(request.assessmentAvailable),
      lastActivityAt: progress?.lastActivityAt ?? null,
    };

    const actions = decideNextActions({
      snapshot,
      catalog,
      policy,
      now: request.now,
    });
    const plan = buildAdaptivePlan({
      userKey: request.userKey,
      courseId: request.courseId,
      actions,
      policy,
      now: request.now,
    });

    if (this.deps.decisions && plan.nextBest) {
      await this.deps.decisions.save({
        userKey: request.userKey,
        courseId: request.courseId,
        tenantId: request.tenantId ?? null,
        decision: plan.nextBest,
        plan,
        policyVersion: policy.version,
        createdAt: plan.computedAt,
      });
    }

    return { nextBest: plan.nextBest, actions, plan, policy };
  }
}

/** Texto curto para o Tutor consumir (sem duplicar regras no prompt). */
export function formatAdaptiveHintForTutor(result: AdaptiveDecideResult): string {
  if (!result.nextBest) {
    return '## ADAPTIVE_NEXT_BEST\nSem próxima ação calculada — orientar revisão geral do curso.';
  }
  const a = result.nextBest;
  const lines = [
    '## ADAPTIVE_NEXT_BEST',
    `Ação oficial: ${a.actionType}`,
    `Motivo: ${a.reason}`,
    a.lessonTitle ? `Conteúdo: ${a.lessonTitle}` : null,
    `Confidence: ${a.confidence}`,
    `Policy: ${a.policyKey}@${a.policyVersion}`,
    'Regra: use esta decisão oficial; NÃO invente outra progressão acadêmica.',
  ];
  return lines.filter(Boolean).join('\n');
}
