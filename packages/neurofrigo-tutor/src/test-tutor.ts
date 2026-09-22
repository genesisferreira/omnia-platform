import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import { estimateLevel, levelInstruction } from './personalization/level';
import { buildRecommendations, buildStudyPlan, detectGaps } from './recommendations';
import { TutorService } from './tutor/tutor-service';
import type { CourseCatalog, LearningProfile, StudentProfile, TutorAskPort } from './domain/types';

const catalog: CourseCatalog = {
  courseId: '1',
  courseTitle: 'Fundamentos',
  modules: [
    {
      id: 'm1',
      title: 'Introdução e Segurança',
      slug: 'intro',
      order: 1,
      lessons: [],
    },
    {
      id: 'm2',
      title: 'Ciclo de Compressão',
      slug: 'ciclo',
      order: 2,
      lessons: [],
    },
  ],
  lessons: [
    {
      id: 'l1',
      title: 'Bem-vindo',
      slug: 'bem-vindo',
      moduleId: 'm1',
      moduleTitle: 'Introdução e Segurança',
      order: 1,
      moduleOrder: 1,
    },
    {
      id: 'l2',
      title: 'Normas e EPIs',
      slug: 'normas',
      moduleId: 'm1',
      moduleTitle: 'Introdução e Segurança',
      order: 2,
      moduleOrder: 1,
    },
    {
      id: 'l3',
      title: 'Apostila do ciclo',
      slug: 'apostila',
      moduleId: 'm2',
      moduleTitle: 'Ciclo de Compressão',
      order: 1,
      moduleOrder: 2,
    },
  ],
};
catalog.modules[0]!.lessons = catalog.lessons.filter((l) => l.moduleId === 'm1');
catalog.modules[1]!.lessons = catalog.lessons.filter((l) => l.moduleId === 'm2');

const student: StudentProfile = {
  userId: 'u1',
  tenantId: null,
  enrolledCourseIds: ['1'],
  progressPercent: 10,
  completedModuleIds: [],
  completedLessonIds: ['l1'],
  lastActivityAt: new Date().toISOString(),
  studyTimeMinutes: 40,
  language: 'pt-BR',
  courseId: '1',
};

const learning: LearningProfile = {
  userId: 'u1',
  courseId: '1',
  level: 'beginner',
  masteredTopics: ['Bem-vindo'],
  pendingTopics: ['Ciclo de Compressão'],
  reviewedTopics: [],
  difficultyTopics: [],
  aiUsageCount: 2,
  avgGrounding: 0.5,
  negativeFeedbackCount: 0,
  repeatedQuestions: [],
};

describe('neurofrigo-tutor', () => {
  it('estimates levels and instructions', () => {
    assert.equal(
      estimateLevel({
        progressPercent: 10,
        aiUsageCount: 0,
        avgGrounding: 0,
        negativeFeedbackCount: 0,
      }),
      'beginner',
    );
    assert.equal(
      estimateLevel({
        progressPercent: 90,
        aiUsageCount: 10,
        avgGrounding: 0.7,
        negativeFeedbackCount: 0,
      }),
      'specialist',
    );
    assert.ok(levelInstruction('beginner').includes('simples'));
    assert.ok(levelInstruction('specialist').includes('normas'));
  });

  it('builds recommendations and study plan from LMS catalog only', () => {
    const recs = buildRecommendations({ catalog, student, learning, currentLessonId: 'l1' });
    assert.ok(recs.some((r) => r.type === 'next_lesson'));
    assert.equal(recs.find((r) => r.type === 'next_lesson')?.lessonId, 'l2');

    const plan = buildStudyPlan({
      objective: 'Quero aprender refrigeração e ciclo de compressão',
      catalog,
      student,
    });
    assert.ok(plan.steps.length >= 1);
    assert.ok(plan.steps.some((s) => /ciclo|compress/i.test(s.lessonTitle + s.moduleTitle)));
  });

  it('detects learning gaps', () => {
    const gaps = detectGaps({
      learning: {
        ...learning,
        repeatedQuestions: ['o que é compressao'],
        difficultyTopics: ['norma inexistente'],
        negativeFeedbackCount: 2,
      },
      catalog,
    });
    assert.ok(gaps.length >= 2);
  });

  it('TutorService personalizes via Runtime port without owning retrieval', async () => {
    const runtimeCalls: unknown[] = [];
    const runtime: TutorAskPort = {
      async ask(req) {
        runtimeCalls.push(req);
        const answer: RuntimeAnswer = {
          text: 'Resposta grounded',
          formattedText: '## Resposta\n\nResposta grounded',
          sources: [],
          confidence: 0.7,
          tookMs: 10,
          model: 'grounded',
          provider: 'grounded',
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          estimatedCostUsd: 0,
          status: 'ok',
          intent: 'definition',
          grounding: {
            score: 0.7,
            sourceCount: 1,
            avgSimilarity: 0.7,
            coverage: 0.5,
            contextChars: 100,
            confidence: 0.7,
          },
          explainability: null,
        };
        return { answer, sessionId: 99 };
      },
    };

    const tutor = new TutorService({
      runtime,
      students: {
        async getOrSync() {
          return student;
        },
      },
      learning: {
        async getOrSync() {
          return learning;
        },
        async recordUsage() {},
      },
      catalog: {
        async load() {
          return catalog;
        },
      },
      signals: {
        async listRecentQuestions() {
          return [];
        },
        async countNegativeFeedback() {
          return 0;
        },
      },
    });

    const beginner = await tutor.ask({
      question: 'O que é segurança?',
      userId: 'u1',
      courseId: '1',
      courseTitle: 'Fundamentos',
    });
    assert.equal(beginner.level, 'beginner');
    assert.ok(beginner.recommendations.length >= 1);
    assert.ok(
      String(
        (runtimeCalls[0] as { identity: { profileLabel: string } }).identity.profileLabel,
      ).includes('Iniciante'),
    );

    const planAns = await tutor.ask({
      question: 'Quero aprender refrigeração industrial',
      userId: 'u1',
      courseId: '1',
      requestStudyPlan: true,
    });
    assert.ok(planAns.studyPlan);
    assert.ok(planAns.studyPlan!.steps.length >= 1);
  });
});
