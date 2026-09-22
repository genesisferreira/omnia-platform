import type { Payload } from 'payload';
import { CommercialService } from '@omnia/neurofrigo-commercial';
import type { AskResult } from '../neurofrigo/ask';
import { runNeurofrigoAsk } from '../neurofrigo/ask';
import { loadCommercialProfile } from './profiles';
import { refreshCommercialAiDashboard } from './dashboard';

export async function createCommercialService(payload: Payload): Promise<CommercialService> {
  return new CommercialService({
    runtime: {
      ask: async (request) => {
        const result = await runNeurofrigoAsk(payload, {
          ...request,
          assistantId: 'commercial',
          orchestrate: false,
          skipCommercialEnrichment: true,
        });
        return {
          answer: result.answer,
          sessionId: result.sessionId,
          assistantKey: result.assistantKey,
          modelKey: result.modelKey ?? null,
        };
      },
    },
    profiles: {
      loadActive: (key) => loadCommercialProfile(payload, key),
    },
    courses: {
      async listPublishedTitles(limit = 20) {
        const res = await payload.find({
          collection: 'courses',
          where: { status: { equals: 'published' } },
          limit,
          overrideAccess: true,
        });
        return res.docs.map((d) => String(d.title || '')).filter(Boolean);
      },
    },
  });
}

export async function runCommercialAsk(
  payload: Payload,
  request: {
    question: string;
    sessionId?: string | number | null;
    userId?: string | null;
    role?: string | null;
    tenantId?: string | null;
    language?: string | null;
    companyIds?: Array<string | number>;
    courseId?: string | null;
    courseTitle?: string | null;
    moduleId?: string | null;
    moduleTitle?: string | null;
    lessonId?: string | null;
    lessonTitle?: string | null;
    ownerCompanyId?: string | null;
    requestProposal?: boolean;
  },
): Promise<
  AskResult & {
    proposalMarkdown?: string | null;
    recommendations?: ReturnType<CommercialService['ask']> extends Promise<infer R>
      ? R extends { recommendations: infer Rec }
        ? Rec
        : never
      : never;
  }
> {
  const service = await createCommercialService(payload);
  const result = await service.ask({
    question: request.question,
    sessionId: request.sessionId,
    userId: request.userId,
    role: request.role,
    tenantId: request.tenantId,
    language: request.language,
    companyIds: request.companyIds,
    courseId: request.courseId,
    courseTitle: request.courseTitle,
    moduleId: request.moduleId,
    moduleTitle: request.moduleTitle,
    lessonId: request.lessonId,
    lessonTitle: request.lessonTitle,
    ownerCompanyId: request.ownerCompanyId,
    requestProposal: request.requestProposal,
  });

  // Marca sessão para dashboard (update leve do último session filters)
  try {
    const existing = await payload.findByID({
      collection: 'ai-sessions',
      id: result.sessionId,
      depth: 0,
      overrideAccess: true,
    });
    const filters = {
      ...((existing.filters || {}) as Record<string, unknown>),
      assistantKey: 'commercial',
      assistantId: 'commercial',
      proposalGenerated: Boolean(result.proposalMarkdown),
      topProducts: result.recommendations.products.map((p) => p.title),
      commercialProfileKey: result.profile.key,
    };
    await payload.update({
      collection: 'ai-sessions',
      id: result.sessionId,
      data: { filters },
      overrideAccess: true,
      context: { neurofrigoRuntimeActive: true },
    });
  } catch {
    /* ignore */
  }

  await refreshCommercialAiDashboard(payload).catch(() => undefined);

  const text = result.proposalMarkdown
    ? `${result.answer.formattedText || result.answer.text}\n\n---\n\n${result.proposalMarkdown}`
    : result.answer.formattedText || result.answer.text;

  return {
    answer: {
      ...result.answer,
      text,
      formattedText: text,
    },
    sessionId: result.sessionId,
    assistantKey: 'commercial',
    specialistLabel: `Comercial IA · ${result.profile.companyName}`,
    modelKey: null,
    proposalMarkdown: result.proposalMarkdown,
    recommendations: result.recommendations,
  };
}
