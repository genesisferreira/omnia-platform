import type { Payload } from 'payload';

function isCommercialSession(filters: unknown): boolean {
  if (!filters || typeof filters !== 'object') return false;
  const f = filters as Record<string, unknown>;
  const key = String(f.assistantKey || f.assistantId || '');
  return key === 'commercial';
}

export async function refreshCommercialAiDashboard(payload: Payload): Promise<void> {
  const sessions = await payload.find({
    collection: 'ai-sessions',
    limit: 500,
    sort: '-updatedAt',
    overrideAccess: true,
  });

  const commercial = sessions.docs.filter((d) => isCommercialSession(d.filters));
  const consultationsCount = commercial.length;
  const proposalsGenerated = commercial.filter((d) => {
    const f = (d.filters || {}) as Record<string, unknown>;
    return Boolean(f.proposalGenerated);
  }).length;

  const groundingValues = commercial.map((d) => Number(d.groundingScore || 0)).filter((n) => n > 0);
  const avgGroundingScore = groundingValues.length
    ? Number((groundingValues.reduce((a, b) => a + b, 0) / groundingValues.length).toFixed(3))
    : 0;
  const avgTookMs = commercial.length
    ? Math.round(commercial.reduce((s, d) => s + Number(d.tookMs || 0), 0) / commercial.length)
    : 0;

  const productMap = new Map<string, number>();
  const docMap = new Map<string, number>();
  for (const d of commercial) {
    const f = (d.filters || {}) as Record<string, unknown>;
    const products = Array.isArray(f.topProducts) ? f.topProducts : [];
    for (const p of products) {
      const title = typeof p === 'string' ? p : String((p as { title?: string }).title || '');
      if (!title) continue;
      productMap.set(title, (productMap.get(title) || 0) + 1);
    }
    const sources = Array.isArray(d.sources) ? d.sources : [];
    for (const s of sources) {
      if (!s || typeof s !== 'object') continue;
      const citation = (s as { citation?: { knowledgeDocumentId?: string } }).citation;
      const docId = citation?.knowledgeDocumentId;
      if (!docId) continue;
      docMap.set(String(docId), (docMap.get(String(docId)) || 0) + 1);
    }
  }

  const sessionIds = commercial.map((d) => d.id);
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
    slug: 'commercial-ai-dashboard',
    data: {
      consultationsCount,
      proposalsGenerated,
      topProducts: [...productMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
      documentsUsed: [...docMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
      avgGroundingScore,
      avgFeedbackScore,
      avgTookMs,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `consultas=${consultationsCount} propostas=${proposalsGenerated} grounding=${avgGroundingScore}`,
    },
    overrideAccess: true,
  });
}
