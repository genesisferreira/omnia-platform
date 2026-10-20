import type { Payload } from 'payload';
import { EngineeringService } from '@omnia/neurofrigo-engineering';
import type { AskResult } from '../neurofrigo/ask';
import { runNeurofrigoAsk } from '../neurofrigo/ask';
import { getSipAssistantContext } from '../sip/profile';
import { loadEngineeringProfile } from './profiles';
import { refreshEngineeringAiDashboard } from './dashboard';

export async function createEngineeringService(payload: Payload): Promise<EngineeringService> {
  return new EngineeringService({
    runtime: {
      ask: async (request) => {
        const result = await runNeurofrigoAsk(payload, {
          ...request,
          assistantId: 'engineering',
          orchestrate: false,
          skipEngineeringEnrichment: true,
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
      loadActive: (key) => loadEngineeringProfile(payload, key),
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

export async function runEngineeringAsk(
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
    requestTroubleshooting?: boolean;
    requestComparison?: boolean;
  },
): Promise<
  AskResult & {
    troubleshootingMarkdown?: string | null;
    comparisonMarkdown?: string | null;
    recommendations?: Awaited<ReturnType<EngineeringService['ask']>>['recommendations'];
  }
> {
  let sipHint: string | null = null;
  if (request.userId && request.userId !== 'anonymous' && request.courseId) {
    try {
      const ctx = await getSipAssistantContext(payload, {
        userKey: request.userId,
        courseId: String(request.courseId),
        ensureFresh: false,
      });
      sipHint = ctx?.summaryText ?? null;
    } catch {
      /* ignore */
    }
  }

  const service = await createEngineeringService(payload);
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
    requestTroubleshooting: request.requestTroubleshooting,
    requestComparison: request.requestComparison,
    studentContext: sipHint,
  });

  try {
    const existing = await payload.findByID({
      collection: 'ai-sessions',
      id: result.sessionId,
      depth: 0,
      overrideAccess: true,
    });
    const filters = {
      ...((existing.filters || {}) as Record<string, unknown>),
      assistantKey: 'engineering',
      assistantId: 'engineering',
      troubleshootingGenerated: Boolean(result.troubleshootingMarkdown),
      comparisonGenerated: Boolean(result.comparisonMarkdown),
      engineeringProfileKey: result.profile.key,
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

  await refreshEngineeringAiDashboard(payload).catch(() => undefined);

  const extras = [result.troubleshootingMarkdown, result.comparisonMarkdown]
    .filter(Boolean)
    .join('\n\n---\n\n');
  const text = extras
    ? `${result.answer.formattedText || result.answer.text}\n\n---\n\n${extras}`
    : result.answer.formattedText || result.answer.text;

  return {
    answer: {
      ...result.answer,
      text,
      formattedText: text,
    },
    sessionId: result.sessionId,
    assistantKey: 'engineering',
    specialistLabel: `Engenharia IA · ${result.profile.companyName}`,
    modelKey: null,
    troubleshootingMarkdown: result.troubleshootingMarkdown,
    comparisonMarkdown: result.comparisonMarkdown,
    recommendations: result.recommendations,
  };
}
