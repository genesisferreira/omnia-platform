import type { RuntimeAnswer, RuntimeRequest } from '@omnia/neurofrigo-runtime';

import type {
  AiSignalsPort,
  CourseCatalogPort,
  LearningProfilePort,
  StudentProfilePort,
  TutorAnswer,
  TutorAskPort,
  TutorAskRequest,
} from '../domain/types';
import {
  buildEncouragement,
  buildPersonalizedHint,
  buildProfileLabel,
  mergeLearningSignals,
} from '../personalization/level';
import { LEVEL_LABELS } from '../domain/types';
import { composeLmsNextStepAnswer, isLmsNextStepQuestion } from '../intent/lms-next-step';
import { buildRecommendations, buildStudyPlan, detectGaps } from '../recommendations';

export type TutorServiceDeps = {
  runtime: TutorAskPort;
  students: StudentProfilePort;
  learning: LearningProfilePort;
  catalog: CourseCatalogPort;
  signals: AiSignalsPort;
};

/**
 * TutorService — orquestra perfis + Runtime existente.
 * Não acessa banco; não duplica Retrieval/PromptBuilder.
 */
export class TutorService {
  constructor(private readonly deps: TutorServiceDeps) {}

  async ask(request: TutorAskRequest): Promise<TutorAnswer> {
    const userId = request.userId?.trim() || 'anonymous';
    const courseId = String(request.courseId);

    const student = await this.deps.students.getOrSync({
      userId,
      tenantId: request.tenantId ?? null,
      courseId,
      language: request.language ?? 'pt-BR',
    });

    let learning = await this.deps.learning.getOrSync({
      userId,
      courseId,
      student,
    });

    const [questions, negativeFeedbackCount, catalog] = await Promise.all([
      this.deps.signals.listRecentQuestions({ userId, courseId, limit: 30 }),
      this.deps.signals.countNegativeFeedback({ userId, courseId }),
      this.deps.catalog.load(courseId),
    ]);

    learning = mergeLearningSignals(learning, student, {
      questions,
      negativeFeedbackCount,
    });

    const wantsPlan =
      request.requestStudyPlan === true ||
      Boolean(request.objective?.trim()) ||
      /plano de estudo|quero aprender|montar um plano|roteiro de estudo/i.test(request.question);

    const objective = request.objective?.trim() || (wantsPlan ? request.question.trim() : null);

    const personalizedHint = buildPersonalizedHint(learning.level);
    const profileLabel = buildProfileLabel(learning.level, student);

    const recommendations = catalog
      ? buildRecommendations({
          catalog,
          student,
          learning,
          currentLessonId: request.lessonId,
        })
      : [];

    const studyPlan =
      wantsPlan && objective && catalog ? buildStudyPlan({ objective, catalog, student }) : null;

    const gaps = catalog ? detectGaps({ learning, catalog }) : [];
    const encouragement = buildEncouragement(learning.level, student, gaps.length);

    // LMS navigation — answer from progress/recommendations, not Knowledge dump.
    if (isLmsNextStepQuestion(request.question)) {
      const text = composeLmsNextStepAnswer({
        courseTitle: request.courseTitle ?? catalog?.courseTitle,
        progressPercent: student.progressPercent,
        currentLessonTitle: request.lessonTitle,
        recommendations,
        student,
      });
      const answer: RuntimeAnswer = {
        text,
        formattedText: text,
        sources: [],
        confidence: 0.95,
        tookMs: 0,
        model: 'lms-next-step',
        provider: 'tutor-lms',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        status: 'ok',
        intent: 'procedural',
        grounding: {
          score: 1,
          sourceCount: 0,
          avgSimilarity: 1,
          coverage: 1,
          contextChars: 0,
          confidence: 0.95,
        },
        explainability: {
          sourceCount: 0,
          avgScore: 1,
          confidence: 0.95,
          documents: [],
          retrievalTookMs: 0,
          llmTookMs: 0,
          intent: 'procedural',
          justification: 'Answered from LMS progress/catalog, not retrieval dump.',
        },
        dialogueIntent: 'lms_next_step',
      };

      await this.deps.learning.recordUsage({
        userId,
        courseId,
        question: request.question,
        groundingScore: 1,
        confidence: 0.95,
        status: 'ok',
      });

      return {
        answer,
        sessionId: request.sessionId ?? `lms-next-${Date.now()}`,
        level: learning.level,
        levelLabel: LEVEL_LABELS[learning.level],
        student,
        learning,
        recommendations,
        studyPlan,
        gaps,
        encouragement,
        personalizedHint,
      };
    }

    const runtimeRequest: RuntimeRequest = {
      question: request.question,
      sessionId: request.sessionId ?? null,
      assistantKey: request.assistantKey ?? 'tutor',
      channel: 'portal_chat',
      identity: {
        userId,
        role: request.role ?? 'student',
        tenantId: request.tenantId ?? null,
        language: request.language ?? student.language ?? 'pt-BR',
        profileLabel,
      },
      course: {
        courseId,
        courseTitle: request.courseTitle ?? catalog?.courseTitle ?? null,
        moduleId: request.moduleId ?? null,
        moduleTitle: request.moduleTitle ?? null,
        lessonId: request.lessonId ?? null,
        lessonTitle: request.lessonTitle ?? null,
        lessonObjectives:
          request.lessonObjectives ||
          `Nível ${LEVEL_LABELS[learning.level]}. Progresso ${Math.round(student.progressPercent)}%. ${personalizedHint}`,
        ownerCompanyId: request.ownerCompanyId ?? null,
      },
      domainContext: request.domainContext ?? null,
    };

    const { answer, sessionId } = await this.deps.runtime.ask(runtimeRequest);

    await this.deps.learning.recordUsage({
      userId,
      courseId,
      question: request.question,
      groundingScore: answer.grounding?.score ?? 0,
      confidence: answer.confidence ?? 0,
      status: answer.status,
    });

    return {
      answer,
      sessionId,
      level: learning.level,
      levelLabel: LEVEL_LABELS[learning.level],
      student,
      learning,
      recommendations,
      studyPlan,
      gaps,
      encouragement,
      personalizedHint,
    };
  }
}
