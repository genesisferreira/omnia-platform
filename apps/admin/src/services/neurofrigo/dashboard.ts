import type { Payload } from 'payload';

function topCounts(values: string[], limit = 10): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function refreshNeurofrigoAiDashboard(payload: Payload): Promise<void> {
  const sessions = await payload.find({
    collection: 'ai-sessions',
    limit: 500,
    sort: '-createdAt',
    depth: 0,
    overrideAccess: true,
  });

  const docs = sessions.docs;
  const took = docs.map((d) => Number(d.tookMs || 0));
  const avgTookMs = took.length
    ? Math.round(took.reduce((a, b) => a + b, 0) / took.length)
    : 0;
  const totalTokens = docs.reduce((s, d) => s + Number(d.totalTokens || 0), 0);
  const estimatedCostUsd = Number(
    docs.reduce((s, d) => s + Number(d.estimatedCostUsd || 0), 0).toFixed(6),
  );
  const errorCount = docs.filter((d) => d.status === 'error' || d.status === 'timeout').length;
  const notFoundCount = docs.filter((d) => d.status === 'not_found').length;

  const courseKeys = docs.map((d) => {
    const c = d.course;
    if (c && typeof c === 'object' && 'id' in c) return String((c as { id: number }).id);
    return c != null ? String(c) : '';
  });

  await payload.updateGlobal({
    slug: 'neurofrigo-ai-dashboard',
    data: {
      questionsCount: sessions.totalDocs,
      avgTookMs,
      totalTokens,
      estimatedCostUsd,
      errorCount,
      notFoundCount,
      topCourses: topCounts(courseKeys),
      topQuestions: topCounts(docs.map((d) => String(d.question || '').slice(0, 120))),
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `q=${sessions.totalDocs} avgMs=${avgTookMs} errors=${errorCount}`,
    },
    overrideAccess: true,
  });
}
