import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectEvidenceFromSignals } from './evidence/collect';
import { computeCompetencies } from './competency/competency-engine';
import { inferPreferences } from './learning/preferences';
import { computeInsights } from './insights';
import { buildSipRecommendations } from './recommendations';
import { recalculateSipTwin, toAssistantContext, toPortalView } from './profile/service';
import type { SipEvidenceInput } from './domain/types';

const signals: SipEvidenceInput = {
  progressPercent: 45,
  studyTimeMinutes: 80,
  completedLessonIds: ['1', '2', '3'],
  completedModuleIds: ['m1'],
  masteredTopics: ['Termodinâmica básica', 'CO2 industrial'],
  difficultyTopics: ['Comandos elétricos'],
  pendingTopics: ['Automação'],
  aiUsageCount: 8,
  avgGrounding: 0.72,
  negativeFeedbackCount: 1,
  recentQuestions: [
    {
      question: 'Como funciona o ciclo de refrigeração com CO2?',
      groundingScore: 0.8,
      status: 'ok',
    },
    { question: 'Explique termodinâmica do evaporador', groundingScore: 0.7, status: 'ok' },
    { question: 'Partida de motor elétrico em comandos', groundingScore: 0.4, status: 'ok' },
  ],
};

describe('student-intelligence', () => {
  it('collects multiple evidence sources', () => {
    const ev = collectEvidenceFromSignals({
      userKey: 'u1',
      courseId: 'c1',
      signals,
    });
    assert.ok(ev.length >= 5);
    assert.ok(ev.some((e) => e.sourceType === 'lms'));
    assert.ok(ev.some((e) => e.sourceType === 'question'));
  });

  it('does not swing competency on single weak evidence alone', () => {
    const previous = [
      {
        key: 'co2',
        label: 'CO₂',
        score: 0.6,
        confidence: 0.5,
        trend: 'stable' as const,
        lastUpdate: '2026-01-01T00:00:00.000Z',
      },
    ];
    const one = computeCompetencies({
      evidence: [
        {
          sourceType: 'question',
          sourceId: null,
          competencyKey: 'co2',
          strength: 0.1,
          summary: 'co2 duvida',
          at: '2026-01-02T00:00:00.000Z',
          confidence: 0.3,
        },
      ],
      previous,
    });
    const co2 = one.find((c) => c.key === 'co2')!;
    assert.ok(Math.abs(co2.score - 0.6) < 0.12);
  });

  it('recalculates twin with audit and assistant context', () => {
    const { twin, audit, evidence } = recalculateSipTwin({
      userKey: '42',
      courseId: '10',
      evidenceInput: signals,
      motivation: {
        goals: ['emprego', 'co2'],
        notes: null,
        updatedByStudentAt: null,
      },
      catalogHints: [{ id: 'l1', title: 'Fundamentos CO2', competencyKey: 'co2' }],
    });
    assert.equal(twin.userKey, '42');
    assert.ok(twin.competencies.length >= 7);
    assert.ok(twin.recommendations.length > 0);
    assert.ok(twin.insights.imt >= 0);
    assert.equal(audit.event, 'sip.recalculate');
    assert.ok(evidence.length >= 2);

    const ctx = toAssistantContext(twin);
    assert.ok(ctx.summaryText.includes('SIP_STUDENT_CONTEXT'));
    assert.ok(ctx.goals.includes('emprego'));

    const portal = toPortalView(twin);
    assert.ok(!('imt' in portal));
    assert.ok(portal.competencies.length > 0);
  });

  it('infers preferences without asking', () => {
    const { twin } = recalculateSipTwin({
      userKey: '42',
      courseId: '10',
      evidenceInput: signals,
    });
    const prefs = inferPreferences({
      evidence: collectEvidenceFromSignals({
        userKey: '42',
        courseId: '10',
        signals,
      }),
      competencies: twin.competencies,
    });
    assert.ok(prefs.length === 5);
  });

  it('builds insights explainability', () => {
    const { twin, evidence } = recalculateSipTwin({
      userKey: '42',
      courseId: '10',
      evidenceInput: signals,
    });
    const insights = computeInsights({
      competencies: twin.competencies,
      evidence,
      signals,
    });
    assert.ok(insights.explainability.length >= 5);
    assert.ok(insights.reviewRisk >= 0);
  });

  it('builds recommendations from gaps', () => {
    const { twin } = recalculateSipTwin({
      userKey: '42',
      courseId: '10',
      evidenceInput: signals,
    });
    const recs = buildSipRecommendations({
      competencies: twin.competencies,
      preferences: twin.learningProfile.preferences,
      signals,
      courseId: '10',
    });
    assert.ok(recs.length > 0);
  });
});
