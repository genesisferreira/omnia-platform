import type { RuntimeRequest } from '@omnia/neurofrigo-runtime';

import { buildTechnicalContext } from '../context/technical-context-builder';
import { buildComparisonMarkdown, wantsComparison } from '../comparison/technical-comparison';
import {
  buildTroubleshootingMarkdown,
  wantsTroubleshooting,
} from '../troubleshooting/troubleshooting-mode';
import { buildEngineeringRecommendations } from '../recommendations';
import type {
  CourseHintPort,
  EngineeringAnswer,
  EngineeringAskRequest,
  EngineeringProfilePort,
  RuntimeAskPort,
} from '../domain/types';

export type EngineeringServiceDeps = {
  runtime: RuntimeAskPort;
  profiles: EngineeringProfilePort;
  courses?: CourseHintPort;
};

/**
 * EngineeringService — orquestra perfil técnico + Runtime existente.
 * Não acessa banco; não duplica Retrieval/PromptBuilder.
 */
export class EngineeringService {
  constructor(private readonly deps: EngineeringServiceDeps) {}

  async ask(request: EngineeringAskRequest): Promise<EngineeringAnswer> {
    const profile = await this.deps.profiles.loadActive(
      request.profileKey ?? 'omnia-frigo-holding-engineering',
    );
    if (!profile || profile.status !== 'active') {
      throw new Error('ENGINEERING_PROFILE_MISSING');
    }

    const technicalContext = buildTechnicalContext({
      profile,
      technicalHint: request.technicalHint,
    });

    const tsWanted = wantsTroubleshooting(request.question, request.requestTroubleshooting);
    const compareWanted = wantsComparison(request.question, request.requestComparison);

    const modeHints: string[] = [];
    if (tsWanted) {
      modeHints.push(
        'O usuário solicitou troubleshooting. Estruture hipóteses e verificações com base nas FONTES. Nunca afirme diagnóstico definitivo; indique necessidade de inspeção técnica.',
      );
    }
    if (compareWanted) {
      modeHints.push(
        'O usuário solicitou comparação técnica. Compare somente tecnologias presentes nas FONTES. Não invente normas nem desempenho.',
      );
    }

    const runtimeRequest: RuntimeRequest & {
      assistantId?: string;
      orchestrate?: boolean;
    } = {
      question: request.question,
      sessionId: request.sessionId ?? null,
      assistantId: 'engineering',
      orchestrate: false,
      identity: {
        userId: request.userId ?? null,
        role: request.role ?? 'admin',
        tenantId: request.tenantId ?? null,
        companyIds: request.companyIds,
        language: request.language ?? profile.language ?? 'pt-BR',
        profileLabel: `Engenharia IA · ${profile.companyName} · ${technicalContext.specialty}`,
      },
      course: {
        courseId: request.courseId ?? null,
        courseTitle: request.courseTitle ?? null,
        moduleId: request.moduleId ?? null,
        moduleTitle: request.moduleTitle ?? null,
        lessonId: request.lessonId ?? null,
        lessonTitle: request.lessonTitle ?? null,
        lessonObjectives: [
          '## TECHNICAL_CONTEXT',
          technicalContext.summaryText,
          request.studentContext || '',
          ...modeHints,
        ]
          .filter(Boolean)
          .join('\n\n'),
        ownerCompanyId: request.ownerCompanyId ?? profile.companyId,
      },
    };

    const { answer, sessionId } = await this.deps.runtime.ask(runtimeRequest);

    const publishedCourseTitles = this.deps.courses
      ? await this.deps.courses.listPublishedTitles(20)
      : [];

    const recommendations = buildEngineeringRecommendations({
      answer,
      technicalContext,
      publishedCourseTitles,
    });

    const troubleshootingMarkdown = tsWanted
      ? buildTroubleshootingMarkdown({
          question: request.question,
          answer,
          technicalContext,
        })
      : null;

    const comparisonMarkdown = compareWanted
      ? buildComparisonMarkdown({
          question: request.question,
          answer,
          technicalContext,
        })
      : null;

    return {
      answer,
      sessionId,
      profile,
      technicalContext,
      troubleshootingMarkdown,
      comparisonMarkdown,
      recommendations,
      wantsTroubleshooting: tsWanted,
      wantsComparison: compareWanted,
    };
  }
}
