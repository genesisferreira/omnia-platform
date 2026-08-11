import type {
  AdaptiveCatalog,
  AdaptivePlan,
  AdaptivePlanStep,
  AdaptivePolicy,
  AdaptiveStudentSnapshot,
  DecisionFactor,
  LearningAction,
  LearningActionType,
} from '../domain/types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function daysSince(iso: string | null, now: string): number | null {
  if (!iso) return null;
  const a = Date.parse(iso);
  const b = Date.parse(now);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, (b - a) / (1000 * 60 * 60 * 24));
}

function makeAction(input: {
  actionType: LearningActionType;
  reason: string;
  reasonFriendly: string;
  priority: number;
  confidence: number;
  snapshot: AdaptiveStudentSnapshot;
  policy: AdaptivePolicy;
  now: string;
  lesson?: AdaptiveCatalog['lessons'][number] | null;
  moduleId?: string | null;
  competencyIds?: string[];
  evidenceIds?: string[];
  factors: DecisionFactor[];
}): LearningAction {
  const lesson = input.lesson || null;
  return {
    actionType: input.actionType,
    reason: input.reason,
    reasonFriendly: input.reasonFriendly,
    priority: input.priority,
    confidence: Number(clamp01(input.confidence).toFixed(3)),
    courseId: input.snapshot.courseId,
    moduleId: lesson?.moduleId ?? input.moduleId ?? null,
    lessonId: lesson?.id ?? null,
    lessonSlug: lesson?.slug ?? null,
    lessonTitle: lesson?.title ?? null,
    competencyIds: input.competencyIds || [],
    evidenceIds: input.evidenceIds || [],
    factors: input.factors,
    expiresAt: new Date(Date.parse(input.now) + 1000 * 60 * 60 * 6).toISOString(),
    createdAt: input.now,
    policyKey: input.policy.key,
    policyVersion: input.policy.version,
  };
}

function nextIncompleteLesson(catalog: AdaptiveCatalog, completed: Set<string>) {
  const sorted = [...catalog.lessons].sort(
    (a, b) => a.moduleOrder - b.moduleOrder || a.order - b.order,
  );
  return sorted.find((l) => !completed.has(l.id)) || null;
}

function firstLessonOfNextIncompleteModule(
  catalog: AdaptiveCatalog,
  completedModules: Set<string>,
  completedLessons: Set<string>,
) {
  const mods = [...catalog.modules].sort((a, b) => a.order - b.order);
  const nextMod = mods.find((m) => !completedModules.has(m.id));
  if (!nextMod) return null;
  const lessons = catalog.lessons
    .filter((l) => l.moduleId === nextMod.id)
    .sort((a, b) => a.order - b.order);
  return lessons.find((l) => !completedLessons.has(l.id)) || lessons[0] || null;
}

/**
 * AdaptiveDecisionEngine — determinístico, reproduzível, sem LLM.
 */
export function decideNextActions(input: {
  snapshot: AdaptiveStudentSnapshot;
  catalog: AdaptiveCatalog | null;
  policy: AdaptivePolicy;
  now?: string;
}): LearningAction[] {
  const now = input.now || new Date().toISOString();
  const { snapshot, policy, catalog } = input;
  const actions: LearningAction[] = [];
  const completed = new Set(snapshot.completedLessonIds);
  const completedMods = new Set(snapshot.completedModuleIds);
  const reviewRisk = snapshot.insights?.reviewRisk ?? 0;
  const skillGap = snapshot.insights?.skillGap ?? 0;
  const topGap = snapshot.sip.gaps[0] || null;
  const staleDays = daysSince(snapshot.lastActivityAt, now);

  // Curso concluído
  if (catalog && catalog.lessons.length > 0 && completed.size >= catalog.lessons.length) {
    actions.push(
      makeAction({
        actionType: 'REVISIT_CONTENT',
        reason: 'Curso concluído — reforço de retenção recomendado.',
        reasonFriendly: 'Você concluiu o curso. Que tal revisar os pontos principais?',
        priority: 40,
        confidence: 0.75,
        snapshot,
        policy,
        now,
        lesson: catalog.lessons[catalog.lessons.length - 1] || null,
        factors: [
          {
            key: 'progressPercent',
            value: snapshot.progressPercent,
            weight: 1,
            note: '100% aulas',
          },
          { key: 'completedLessons', value: completed.size, weight: 1, note: 'todas concluídas' },
        ],
      }),
    );
    if (snapshot.assessmentAvailable) {
      actions.push(
        makeAction({
          actionType: 'ASSESSMENT',
          reason: 'Avaliação disponível após conclusão do curso.',
          reasonFriendly: 'Há uma avaliação disponível para consolidar o aprendizado.',
          priority: 50,
          confidence: 0.7,
          snapshot,
          policy,
          now,
          factors: [
            {
              key: 'assessmentAvailable',
              value: true,
              weight: 1,
              note: 'capacidade existente',
            },
          ],
        }),
      );
    }
    return actions.sort((a, b) => b.priority - a.priority).slice(0, policy.maxRecommendations);
  }

  // Pouca evidência → continuar com cautela + tutor
  if (snapshot.evidenceCount < policy.minimumEvidenceCount) {
    const lesson = catalog ? nextIncompleteLesson(catalog, completed) : null;
    actions.push(
      makeAction({
        actionType: lesson ? 'CONTINUE_LESSON' : 'ASK_TUTOR',
        reason: `Evidências insuficientes (${snapshot.evidenceCount} < ${policy.minimumEvidenceCount}).`,
        reasonFriendly: lesson
          ? 'Vamos começar (ou continuar) pela próxima aula do seu curso.'
          : 'Converse com o Tutor para entender por onde começar.',
        priority: 80,
        confidence: 0.55,
        snapshot,
        policy,
        now,
        lesson,
        factors: [
          {
            key: 'evidenceCount',
            value: snapshot.evidenceCount,
            weight: 1,
            note: 'abaixo do mínimo',
          },
        ],
      }),
    );
  }

  // Revisão por risco / gap
  const needsReview =
    reviewRisk >= policy.reviewRiskThreshold ||
    skillGap >= policy.skillGapThreshold ||
    (topGap != null && topGap.score < policy.reviewThreshold) ||
    snapshot.difficultyTopics.length > 0;

  if (needsReview) {
    const reviewLesson =
      (catalog &&
        catalog.lessons.find((l) =>
          snapshot.difficultyTopics.some((t) =>
            l.title.toLowerCase().includes(t.toLowerCase().slice(0, 12)),
          ),
        )) ||
      (catalog && completed.size
        ? [...catalog.lessons].reverse().find((l) => completed.has(l.id))
        : null) ||
      null;

    actions.push(
      makeAction({
        actionType: reviewLesson ? 'REVIEW_LESSON' : 'REVIEW_TOPIC',
        reason: 'Baixo domínio / risco de revisão / tópicos difíceis observados.',
        reasonFriendly: reviewLesson
          ? `Recomendamos revisar: ${reviewLesson.title}.`
          : topGap
            ? `Recomendamos reforçar: ${topGap.label}.`
            : 'Há conteúdos que merecem revisão antes de avançar.',
        priority: 95,
        confidence: clamp01(0.5 + reviewRisk * 0.4),
        snapshot,
        policy,
        now,
        lesson: reviewLesson,
        competencyIds: topGap ? [topGap.key] : [],
        factors: [
          { key: 'reviewRisk', value: reviewRisk, weight: 0.4, note: 'SIP insights' },
          { key: 'skillGap', value: skillGap, weight: 0.3, note: 'SIP insights' },
          {
            key: 'topGapScore',
            value: topGap?.score ?? null,
            weight: 0.3,
            note: topGap?.label || 'n/d',
          },
          {
            key: 'difficultyTopics',
            value: snapshot.difficultyTopics.length,
            weight: 0.2,
            note: snapshot.difficultyTopics.slice(0, 3).join(', ') || 'nenhum',
          },
        ],
      }),
    );

    if (reviewRisk >= policy.reviewRiskThreshold) {
      actions.push(
        makeAction({
          actionType: 'ASK_TUTOR',
          reason: 'Risco de revisão elevado — suporte do Tutor recomendado.',
          reasonFriendly: 'Vale conversar com o Tutor sobre os pontos que estão difíceis.',
          priority: 85,
          confidence: clamp01(reviewRisk),
          snapshot,
          policy,
          now,
          factors: [{ key: 'reviewRisk', value: reviewRisk, weight: 1, note: 'acima do limiar' }],
        }),
      );
    }
  }

  // Continuar / próximo módulo
  if (catalog) {
    const nextLesson = nextIncompleteLesson(catalog, completed);
    if (nextLesson && !needsReview) {
      actions.push(
        makeAction({
          actionType: 'CONTINUE_LESSON',
          reason: 'Bom domínio relativo e aula incompleta no caminho.',
          reasonFriendly: `Continue em: ${nextLesson.title}.`,
          priority: 70,
          confidence: 0.7,
          snapshot,
          policy,
          now,
          lesson: nextLesson,
          factors: [
            {
              key: 'progressPercent',
              value: snapshot.progressPercent,
              weight: 0.5,
              note: 'LMS',
            },
            {
              key: 'reviewRisk',
              value: reviewRisk,
              weight: 0.5,
              note: 'abaixo do limiar de revisão',
            },
          ],
        }),
      );
    } else if (nextLesson && needsReview) {
      // Ainda oferece continuar, mas com prioridade menor que revisão
      actions.push(
        makeAction({
          actionType: 'CONTINUE_LESSON',
          reason: 'Há progresso pendente após a revisão recomendada.',
          reasonFriendly: `Depois da revisão, continue em: ${nextLesson.title}.`,
          priority: 55,
          confidence: 0.6,
          snapshot,
          policy,
          now,
          lesson: nextLesson,
          factors: [{ key: 'nextLesson', value: nextLesson.title, weight: 1, note: 'fila' }],
        }),
      );
    }

    const moduleComplete =
      catalog.modules.some(
        (m) => m.lessonIds.length > 0 && m.lessonIds.every((id) => completed.has(id)),
      ) && completedMods.size < catalog.modules.length;

    if (moduleComplete || (nextLesson && completedMods.size > 0)) {
      const nextModLesson = firstLessonOfNextIncompleteModule(catalog, completedMods, completed);
      if (nextModLesson && (!nextLesson || nextModLesson.moduleId !== nextLesson.moduleId)) {
        actions.push(
          makeAction({
            actionType: 'NEXT_MODULE',
            reason: 'Módulo atual concluído ou próximo módulo disponível.',
            reasonFriendly: `Seguinte módulo: ${nextModLesson.moduleTitle}.`,
            priority: 60,
            confidence: 0.65,
            snapshot,
            policy,
            now,
            lesson: nextModLesson,
            factors: [
              {
                key: 'completedModules',
                value: completedMods.size,
                weight: 1,
                note: 'LMS',
              },
            ],
          }),
        );
      }
    }
  }

  // Prática se preferência prática ou gap
  if (
    snapshot.sip.preferences.includes('pratico') ||
    (topGap && topGap.score < policy.minimumCompetencyScore)
  ) {
    actions.push(
      makeAction({
        actionType: 'PRACTICE',
        reason: 'Preferência prática inferida ou lacuna de competência.',
        reasonFriendly: 'Pratique com exercícios ou exemplos do conteúdo atual.',
        priority: 50,
        confidence: 0.55,
        snapshot,
        policy,
        now,
        competencyIds: topGap ? [topGap.key] : [],
        factors: [
          {
            key: 'preferences',
            value: snapshot.sip.preferences.join(','),
            weight: 0.5,
            note: 'SIP',
          },
          {
            key: 'gap',
            value: topGap?.score ?? null,
            weight: 0.5,
            note: topGap?.label || 'n/d',
          },
        ],
      }),
    );
  }

  // Assessment se disponível e domínio ok
  if (
    snapshot.assessmentAvailable &&
    (snapshot.insights?.imt ?? 0) >= policy.assessmentThreshold * 0.5 &&
    snapshot.progressPercent >= 40
  ) {
    actions.push(
      makeAction({
        actionType: 'ASSESSMENT',
        reason: 'Avaliação disponível e critérios mínimos de progresso/domínio.',
        reasonFriendly: 'Você pode realizar uma avaliação disponível no curso.',
        priority: 45,
        confidence: 0.6,
        snapshot,
        policy,
        now,
        factors: [
          { key: 'assessmentAvailable', value: true, weight: 1, note: 'flag' },
          {
            key: 'progressPercent',
            value: snapshot.progressPercent,
            weight: 0.5,
            note: 'LMS',
          },
        ],
      }),
    );
  }

  // Conhecimento stale
  if (staleDays != null && staleDays >= policy.staleKnowledgeDays) {
    actions.push(
      makeAction({
        actionType: 'REVISIT_CONTENT',
        reason: `Inatividade de ${Math.round(staleDays)} dias (limiar ${policy.staleKnowledgeDays}).`,
        reasonFriendly: 'Faz um tempo desde a última atividade — revise para retomar o ritmo.',
        priority: 75,
        confidence: 0.65,
        snapshot,
        policy,
        now,
        lesson: catalog ? nextIncompleteLesson(catalog, completed) : null,
        factors: [
          { key: 'staleKnowledgeDays', value: staleDays, weight: 1, note: 'lastActivityAt' },
        ],
      }),
    );
  }

  // Dedup by actionType+lessonId
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    const k = `${a.actionType}:${a.lessonId || a.competencyIds[0] || a.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return unique
    .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence)
    .slice(0, policy.maxRecommendations);
}

export function buildAdaptivePlan(input: {
  userKey: string;
  courseId: string;
  actions: LearningAction[];
  policy: AdaptivePolicy;
  now?: string;
}): AdaptivePlan {
  const now = input.now || new Date().toISOString();
  const whens: Array<'now' | 'next' | 'then'> = ['now', 'next', 'then'];
  const steps: AdaptivePlanStep[] = input.actions.slice(0, 3).map((action, i) => ({
    order: i + 1,
    when: whens[i] || 'then',
    action,
  }));
  return {
    userKey: input.userKey,
    courseId: input.courseId,
    steps,
    nextBest: steps[0]?.action || null,
    computedAt: now,
    policyKey: input.policy.key,
    policyVersion: input.policy.version,
  };
}
