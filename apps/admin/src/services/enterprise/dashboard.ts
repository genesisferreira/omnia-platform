import type { Payload } from 'payload';

export async function refreshEnterpriseAiDashboard(payload: Payload): Promise<void> {
  const [sessions, feedbackUp, feedbackDown] = await Promise.all([
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
  for (const d of docs) {
    const filters = (d.filters || {}) as Record<string, unknown>;
    const assistantKey =
      (filters.assistantKey as string) ||
      (filters.assistantId as string) ||
      'default';
    byAssistant.set(assistantKey, (byAssistant.get(assistantKey) || 0) + 1);

    const company =
      (filters as { course?: { ownerCompanyId?: string } }).course?.ownerCompanyId ||
      'n/d';
    byCompany.set(String(company), (byCompany.get(String(company)) || 0) + 1);

    const model = String(d.model || 'unknown');
    byModel.set(model, (byModel.get(model) || 0) + 1);
  }

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
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `sessions=${sessionsCount} tokens=${totalTokens} grounding=${avgGroundingScore}`,
    },
    overrideAccess: true,
  });
}
