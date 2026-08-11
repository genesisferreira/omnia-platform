import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SipAssistantContext, StudentInsights } from '@omnia/student-intelligence';

import { AdaptiveLearningService } from './adaptive/adaptive-service';
import { decideNextActions, buildAdaptivePlan } from './engine/decision-engine';
import { resolveAdaptivePolicy } from './policy/resolve';
import { DEFAULT_ADAPTIVE_POLICY } from './domain/types';
import type { AdaptiveCatalog, AdaptiveStudentSnapshot } from './domain/types';

const sipBase: SipAssistantContext = {
  userKey: 'u1',
  technicalLevel: 'beginner',
  topCompetencies: [{ key: 'co2', label: 'CO₂', score: 0.6 }],
  gaps: [{ key: 'comandos', label: 'Comandos', score: 0.25 }],
  preferences: ['pratico'],
  goals: ['emprego'],
  nextSteps: [],
  summaryText: '## SIP_STUDENT_CONTEXT',
  confidence: 0.5,
  computedAt: '2026-08-11T12:00:00.000Z',
};

const insightsHighRisk: StudentInsights = {
  imt: 0.3,
  learningVelocity: 0.2,
  knowledgeRetention: 0.3,
  confidenceIndex: 0.4,
  reviewRisk: 0.75,
  skillGap: 0.6,
  computedAt: '2026-08-11T12:00:00.000Z',
  explainability: [],
};

const catalog: AdaptiveCatalog = {
  courseId: '10',
  courseTitle: 'Fundamentos',
  modules: [
    { id: 'm1', title: 'Módulo 1', slug: 'm1', order: 1, lessonIds: ['l1', 'l2'] },
    { id: 'm2', title: 'Módulo 2', slug: 'm2', order: 2, lessonIds: ['l3'] },
  ],
  lessons: [
    {
      id: 'l1',
      title: 'Eletricidade básica',
      slug: 'eletricidade',
      moduleId: 'm1',
      moduleTitle: 'Módulo 1',
      order: 1,
      moduleOrder: 1,
    },
    {
      id: 'l2',
      title: 'Comandos elétricos',
      slug: 'comandos',
      moduleId: 'm1',
      moduleTitle: 'Módulo 1',
      order: 2,
      moduleOrder: 1,
    },
    {
      id: 'l3',
      title: 'CO2 industrial',
      slug: 'co2',
      moduleId: 'm2',
      moduleTitle: 'Módulo 2',
      order: 1,
      moduleOrder: 2,
    },
  ],
};

function snap(partial: Partial<AdaptiveStudentSnapshot>): AdaptiveStudentSnapshot {
  return {
    userKey: 'u1',
    courseId: '10',
    sip: sipBase,
    insights: null,
    progressPercent: 0,
    completedLessonIds: [],
    completedModuleIds: [],
    evidenceCount: 0,
    difficultyTopics: [],
    pendingTopics: [],
    assessmentAvailable: false,
    lastActivityAt: null,
    ...partial,
  };
}

describe('adaptive-learning', () => {
  it('A: aluno novo / pouca evidência → CONTINUE ou ASK_TUTOR', () => {
    const actions = decideNextActions({
      snapshot: snap({ evidenceCount: 0 }),
      catalog,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    assert.ok(actions.some((a) => a.actionType === 'CONTINUE_LESSON' || a.actionType === 'ASK_TUTOR'));
  });

  it('B: 25% progresso sem risco alto → CONTINUE_LESSON', () => {
    const actions = decideNextActions({
      snapshot: snap({
        evidenceCount: 5,
        progressPercent: 25,
        completedLessonIds: ['l1'],
        insights: { ...insightsHighRisk, reviewRisk: 0.2, skillGap: 0.2 },
        sip: { ...sipBase, gaps: [{ key: 'co2', label: 'CO₂', score: 0.55 }] },
        difficultyTopics: [],
      }),
      catalog,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    assert.ok(actions.some((a) => a.actionType === 'CONTINUE_LESSON'));
    assert.equal(actions[0]?.lessonId, 'l2');
  });

  it('E: revisão necessária por reviewRisk', () => {
    const actions = decideNextActions({
      snapshot: snap({
        evidenceCount: 8,
        progressPercent: 40,
        completedLessonIds: ['l1'],
        insights: insightsHighRisk,
        difficultyTopics: ['Comandos elétricos'],
      }),
      catalog,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    assert.ok(actions.some((a) => a.actionType === 'REVIEW_LESSON' || a.actionType === 'REVIEW_TOPIC'));
    assert.ok(actions[0]!.factors.some((f) => f.key === 'reviewRisk'));
  });

  it('F: curso concluído → REVISIT_CONTENT', () => {
    const actions = decideNextActions({
      snapshot: snap({
        evidenceCount: 10,
        progressPercent: 100,
        completedLessonIds: ['l1', 'l2', 'l3'],
        completedModuleIds: ['m1', 'm2'],
      }),
      catalog,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    assert.ok(actions.some((a) => a.actionType === 'REVISIT_CONTENT'));
  });

  it('builds adaptive plan with now/next/then', () => {
    const actions = decideNextActions({
      snapshot: snap({ evidenceCount: 5, progressPercent: 10, completedLessonIds: [] }),
      catalog,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    const plan = buildAdaptivePlan({
      userKey: 'u1',
      courseId: '10',
      actions,
      policy: DEFAULT_ADAPTIVE_POLICY,
    });
    assert.ok(plan.nextBest);
    assert.ok(plan.steps.length >= 1);
    assert.equal(plan.steps[0]!.when, 'now');
  });

  it('H: mudança de evidência altera recomendação via service', async () => {
    let evidenceCount = 0;
    const service = new AdaptiveLearningService({
      sip: {
        async getContext() {
          return sipBase;
        },
        async getInsights() {
          return evidenceCount < 3 ? insightsHighRisk : { ...insightsHighRisk, reviewRisk: 0.1, skillGap: 0.1 };
        },
        async getProgress() {
          return {
            progressPercent: evidenceCount < 3 ? 10 : 40,
            completedLessonIds: evidenceCount < 3 ? [] : ['l1'],
            completedModuleIds: [],
            evidenceCount,
            difficultyTopics: evidenceCount < 3 ? ['Comandos'] : [],
            pendingTopics: ['CO2'],
            lastActivityAt: '2026-08-11T10:00:00.000Z',
          };
        },
      },
      catalog: {
        async load() {
          return catalog;
        },
      },
    });

    evidenceCount = 1;
    const before = await service.decide({ userKey: 'u1', courseId: '10' });
    evidenceCount = 8;
    const after = await service.decide({
      userKey: 'u1',
      courseId: '10',
      policy: resolveAdaptivePolicy({ reviewRiskThreshold: 0.6 }),
    });
    assert.ok(before.nextBest);
    assert.ok(after.nextBest);
    // Com risco alto tende a REVIEW*; com risco baixo e progresso a CONTINUE*
    assert.notEqual(
      `${before.nextBest!.actionType}:${before.nextBest!.lessonId}`,
      `${after.nextBest!.actionType}:${after.nextBest!.lessonId}`,
    );
  });

  it('policy resolve merges overrides', () => {
    const p = resolveAdaptivePolicy({ reviewRiskThreshold: 0.9, key: 'curso-x', version: '2.0.0' });
    assert.equal(p.reviewRiskThreshold, 0.9);
    assert.equal(p.key, 'curso-x');
    assert.equal(p.minimumEvidenceCount, DEFAULT_ADAPTIVE_POLICY.minimumEvidenceCount);
  });
});
