import type { Payload } from 'payload';

import { getVectorStore } from './runtime';

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

export async function refreshRetrievalDashboard(payload: Payload): Promise<void> {
  const [ready, failedEmb, pending, processing, failedQ, sessions] = await Promise.all([
    payload.count({
      collection: 'embedding-records',
      where: { status: { equals: 'ready' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'embedding-records',
      where: { status: { equals: 'failed' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'pending' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'processing' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'failed' } },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'search-sessions',
      limit: 200,
      sort: '-createdAt',
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  let vectorCount = 0;
  try {
    const store = await getVectorStore();
    const health = await store.health();
    const match = /vectors=(\d+)/.exec(health.detail);
    vectorCount = match ? Number(match[1]) : 0;
  } catch {
    vectorCount = 0;
  }

  const took = sessions.docs.map((s) => Number(s.tookMs || 0));
  const avgSearchMs = took.length ? Math.round(took.reduce((a, b) => a + b, 0) / took.length) : 0;

  const topQueries = topCounts(sessions.docs.map((s) => String(s.query || '').slice(0, 120)));

  const docIds: string[] = [];
  for (const s of sessions.docs) {
    const chunks = (s.chunkIds as Array<{ chunkId?: string }> | undefined) || [];
    for (const c of chunks) {
      if (c.chunkId) docIds.push(c.chunkId);
    }
  }
  const topDocuments = topCounts(docIds);

  const dash = await payload.findGlobal({
    slug: 'retrieval-dashboard',
    overrideAccess: true,
  });

  await payload.updateGlobal({
    slug: 'retrieval-dashboard',
    data: {
      embeddingsReady: ready.totalDocs,
      embeddingsFailed: failedEmb.totalDocs,
      queuePending: pending.totalDocs,
      queueProcessing: processing.totalDocs,
      queueFailed: failedQ.totalDocs,
      vectorCount,
      avgSearchMs,
      searchSessionsCount: sessions.totalDocs,
      reindexCount: Number(dash.reindexCount || 0),
      topDocuments,
      topQueries,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `ready=${ready.totalDocs} vectors=${vectorCount} avgMs=${avgSearchMs}`,
    },
    overrideAccess: true,
  });
}
