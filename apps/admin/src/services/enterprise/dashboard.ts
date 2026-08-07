import type { Payload } from 'payload';
import { evaluateBudget } from '@omnia/neurofrigo-orchestrator';

export async function refreshEnterpriseAiDashboard(payload: Payload): Promise<void> {
  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sessions, feedbackUp, feedbackDown, today, month] = await Promise.all([
    payload.find({
      collection: 'ai-sessions',
      limit: 500,
      sort: '-updatedAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ai-feedback',
      where: { rating: { equals: 'up' } },
      limit: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ai-feedback',
      where: { rating: { equals: 'down' } },
      limit: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ai-sessions',
      where: { updatedAt: { greater_than_equal: startDay.toISOString() } },
      limit: 500,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ai-sessions',
      where: { updatedAt: { greater_than_equal: startMonth.toISOString() } },
      limit: 500,
      overrideAccess: true,
    }),
  ]);

  const docs = sessions.docs;
  const sessionsCount = sessions.totalDocs;
  const totalTokens = docs.reduce((s, d) => s + Number(d.totalTokens || 0), 0);
  const estimatedCostUsd = Number(
    docs.reduce((s, d) => s + Number(d.estimatedCostUsd || 0), 0).toFixed(6),
  );
  const groundingValues = docs
    .map((d) => Number(d.groundingScore || 0))
    .filter((n) => n > 0);
  const avgGroundingScore = groundingValues.length
    ? Number(
        (
          groundingValues.reduce((a, b) => a + b, 0) / groundingValues.length
        ).toFixed(3),
      )
    : 0;
  const avgTookMs = docs.length
    ? Math.round(docs.reduce((s, d) => s + Number(d.tookMs || 0), 0) / docs.length)
    : 0;
  const errorCount = docs.filter((d) => d.status === 'error' || d.status === 'timeout')
    .length;

  const up = feedbackUp.totalDocs;
  const down = feedbackDown.totalDocs;
  const totalFb = up + down;
  const avgFeedbackScore = totalFb ? Number(((up - down) / totalFb).toFixed(3)) : 0;

  const byAssistant = new Map<string, number>();
  const byCompany = new Map<string, number>();
  const byModel = new Map<string, number>();
  const costByAssistant = new Map<string, number>();
  const costByCompany = new Map<string, number>();
  const costByCourse = new Map<string, number>();

  for (const d of docs) {
    const filters = (d.filters || {}) as Record<string, unknown>;
    const assistantKey =
      (filters.assistantKey as string) ||
      (filters.assistantId as string) ||
      'default';
    byAssistant.set(assistantKey, (byAssistant.get(assistantKey) || 0) + 1);
    costByAssistant.set(
      assistantKey,
      (costByAssistant.get(assistantKey) || 0) + Number(d.estimatedCostUsd || 0),
    );

    const company =
      (filters as { course?: { ownerCompanyId?: string } }).course?.ownerCompanyId ||
      'n/d';
    byCompany.set(String(company), (byCompany.get(String(company)) || 0) + 1);
    costByCompany.set(
      String(company),
      (costByCompany.get(String(company)) || 0) + Number(d.estimatedCostUsd || 0),
    );

    const course =
      (filters as { course?: { courseId?: string } }).course?.courseId || 'n/d';
    costByCourse.set(
      String(course),
      (costByCourse.get(String(course)) || 0) + Number(d.estimatedCostUsd || 0),
    );

    const model = String(d.model || 'unknown');
    byModel.set(model, (byModel.get(model) || 0) + 1);
  }

  const tokensToday = today.docs.reduce((s, d) => s + Number(d.totalTokens || 0), 0);
  const tokensMonth = month.docs.reduce((s, d) => s + Number(d.totalTokens || 0), 0);
  const costTodayUsd = Number(
    today.docs.reduce((s, d) => s + Number(d.estimatedCostUsd || 0), 0).toFixed(6),
  );
  const costMonthUsd = Number(
    month.docs.reduce((s, d) => s + Number(d.estimatedCostUsd || 0), 0).toFixed(6),
  );

  const current = await payload.findGlobal({
    slug: 'enterprise-ai-dashboard',
    overrideAccess: true,
  });

  const budgetStatus = evaluateBudget({
    spentTodayUsd: costTodayUsd,
    spentMonthUsd: costMonthUsd,
    config: {
      dailyLimitUsd: Number(current.budgetDailyUsd ?? 25),
      monthlyLimitUsd: Number(current.budgetMonthlyUsd ?? 400),
      at100: (current.budgetAt100 as 'allow' | 'warn_only' | 'block') || 'warn_only',
    },
  });

  const deepseekCalls = docs.filter((d) => String(d.provider || '') === 'deepseek').length;
  const deepseekStatus =
    deepseekCalls > 0
      ? `ok:${deepseekCalls}_calls`
      : process.env.DEEPSEEK_API_KEY
        ? 'configured_unused'
        : 'key_missing';

  await payload.updateGlobal({
    slug: 'enterprise-ai-dashboard',
    data: {
      sessionsCount,
      totalTokens,
      estimatedCostUsd,
      avgGroundingScore,
      avgTookMs,
      errorCount,
      avgFeedbackScore,
      usageByAssistant: [...byAssistant.entries()].map(([key, count]) => ({ key, count })),
      usageByCompany: [...byCompany.entries()].map(([key, count]) => ({ key, count })),
      modelsUsed: [...byModel.entries()].map(([key, count]) => ({ key, count })),
      deepseekStatus,
      tokensToday,
      tokensMonth,
      costTodayUsd,
      costMonthUsd,
      costByAssistant: [...costByAssistant.entries()].map(([key, usd]) => ({
        key,
        usd: Number(usd.toFixed(6)),
      })),
      costByCompany: [...costByCompany.entries()].map(([key, usd]) => ({
        key,
        usd: Number(usd.toFixed(6)),
      })),
      costByCourse: [...costByCourse.entries()].map(([key, usd]) => ({
        key,
        usd: Number(usd.toFixed(6)),
      })),
      providerBalanceNote: 'Saldo não disponibilizado pelo provider',
      budgetStatus,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `sessions=${sessionsCount} tokens=${totalTokens} deepseek=${deepseekStatus} budget=${budgetStatus.action}`,
    },
    overrideAccess: true,
  });
}
