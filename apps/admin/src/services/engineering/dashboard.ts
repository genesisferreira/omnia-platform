import type { Payload } from 'payload';

function isEngineeringSession(filters: unknown): boolean {
  if (!filters || typeof filters !== 'object') return false;
  const f = filters as Record<string, unknown>;
  const key = String(f.assistantKey || f.assistantId || '');
  return key === 'engineering';
}

export async function refreshEngineeringAiDashboard(payload: Payload): Promise<void> {
  const sessions = await payload.find({
    collection: 'ai-sessions',
    limit: 500,
    sort: '-updatedAt',
    overrideAccess: true,
  });

  const engineering = sessions.docs.filter((d) => isEngineeringSession(d.filters));
  const consultationsCount = engineering.length;
  const troubleshootingCount = engineering.filter((d) => {
    const f = (d.filters || {}) as Record<string, unknown>;
    return Boolean(f.troubleshootingGenerated);
  }).length;
  const comparisonsCount = engineering.filter((d) => {
    const f = (d.filters || {}) as Record<string, unknown>;
    return Boolean(f.comparisonGenerated);
  }).length;

  const groundingValues = engineering
    .map((d) => Number(d.groundingScore || 0))
    .filter((n) => n > 0);
  const avgGroundingScore = groundingValues.length
    ? Number((groundingValues.reduce((a, b) => a + b, 0) / groundingValues.length).toFixed(3))
    : 0;
  const avgTookMs = engineering.length
    ? Math.round(engineering.reduce((s, d) => s + Number(d.tookMs || 0), 0) / engineering.length)
    : 0;

  const docMap = new Map<string, number>();
  for (const d of engineering) {
    const sources = Array.isArray(d.sources) ? d.sources : [];
    for (const s of sources) {
      if (!s || typeof s !== 'object') continue;
      const citation = (s as { citation?: { knowledgeDocumentId?: string } }).citation;
      const docId = citation?.knowledgeDocumentId;
      if (!docId) continue;
      docMap.set(String(docId), (docMap.get(String(docId)) || 0) + 1);
    }
  }

  const sessionIds = engineering.map((d) => d.id);
  let up = 0;
  let down = 0;
  if (sessionIds.length) {
    const [upRes, downRes] = await Promise.all([
      payload.find({
        collection: 'ai-feedback',
        where: {
          and: [{ rating: { equals: 'up' } }, { aiSession: { in: sessionIds } }],
        },
        limit: 1,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'ai-feedback',
        where: {
          and: [{ rating: { equals: 'down' } }, { aiSession: { in: sessionIds } }],
        },
        limit: 1,
        overrideAccess: true,
      }),
    ]);
    up = upRes.totalDocs;
    down = downRes.totalDocs;
  }
  const totalFb = up + down;
  const avgFeedbackScore = totalFb ? Number(((up - down) / totalFb).toFixed(3)) : 0;

  await payload.updateGlobal({
    slug: 'engineering-ai-dashboard',
    data: {
      consultationsCount,
      troubleshootingCount,
      comparisonsCount,
      documentsUsed: [...docMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
      avgGroundingScore,
      avgFeedbackScore,
      avgTookMs,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `consultas=${consultationsCount} ts=${troubleshootingCount} cmp=${comparisonsCount} grounding=${avgGroundingScore}`,
    },
    overrideAccess: true,
  });
}
