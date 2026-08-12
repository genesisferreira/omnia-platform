import type { RuntimeRequest } from '@omnia/neurofrigo-runtime';

import { buildSalesContext } from '../context/sales-context-builder';
import { buildProposalMarkdown, wantsProposal } from '../proposal/proposal-builder';
import { buildCommercialRecommendations } from '../recommendations';
import type {
  CommercialAnswer,
  CommercialAskRequest,
  CommercialProfilePort,
  CourseHintPort,
  RuntimeAskPort,
} from '../domain/types';

export type CommercialServiceDeps = {
  runtime: RuntimeAskPort;
  profiles: CommercialProfilePort;
  courses?: CourseHintPort;
};

/**
 * CommercialService — orquestra perfil comercial + Runtime existente.
 * Não acessa banco; não duplica Retrieval/PromptBuilder.
 */
export class CommercialService {
  constructor(private readonly deps: CommercialServiceDeps) {}

  async ask(request: CommercialAskRequest): Promise<CommercialAnswer> {
    const profile = await this.deps.profiles.loadActive(
      request.profileKey ?? 'omnia-frigo-holding',
    );
    if (!profile || profile.status !== 'active') {
      throw new Error('COMMERCIAL_PROFILE_MISSING');
    }

    const salesContext = buildSalesContext({
      profile,
      clientHint: request.clientHint,
    });

    const proposalWanted = wantsProposal(request.question, request.requestProposal);

    const runtimeRequest: RuntimeRequest & {
      assistantId?: string;
      orchestrate?: boolean;
    } = {
      question: request.question,
      sessionId: request.sessionId ?? null,
      assistantId: 'commercial',
      orchestrate: false,
      identity: {
        userId: request.userId ?? null,
        role: request.role ?? 'admin',
        tenantId: request.tenantId ?? null,
        companyIds: request.companyIds,
        language: request.language ?? profile.language ?? 'pt-BR',
        profileLabel: `Comercial IA · ${profile.companyName} · ${salesContext.segment}`,
      },
      course: {
        courseId: request.courseId ?? null,
        courseTitle: request.courseTitle ?? null,
        moduleId: request.moduleId ?? null,
        moduleTitle: request.moduleTitle ?? null,
        lessonId: request.lessonId ?? null,
        lessonTitle: request.lessonTitle ?? null,
        lessonObjectives: [
          '## SALES_CONTEXT',
          salesContext.summaryText,
          proposalWanted
            ? 'O usuário solicitou proposta comercial. Responda de forma estruturada e fundamentada nas FONTES.'
            : '',
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

    const recommendations = buildCommercialRecommendations({
      answer,
      salesContext,
      publishedCourseTitles,
    });

    const proposalMarkdown = proposalWanted
      ? buildProposalMarkdown({
          question: request.question,
          answer,
          salesContext,
        })
      : null;

    return {
      answer,
      sessionId,
      profile,
      salesContext,
      proposalMarkdown,
      recommendations,
      wantsProposal: proposalWanted,
    };
  }
}
