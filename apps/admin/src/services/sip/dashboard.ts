import type { Payload } from 'payload';

export async function refreshSipDashboard(payload: Payload): Promise<void> {
  const profiles = await payload.find({
    collection: 'sip-profiles',
    limit: 500,
    sort: '-updatedAt',
    overrideAccess: true,
  });

  const evidence = await payload.find({
    collection: 'sip-evidence',
    limit: 1,
    overrideAccess: true,
  });

  const dist = new Map<string, number>();
  let risk = 0;
  let imtSum = 0;
  let retSum = 0;
  let recCount = 0;
  let withInsights = 0;

  for (const d of profiles.docs) {
    const comps = Array.isArray(d.competencies) ? d.competencies : [];
    for (const c of comps) {
      if (!c || typeof c !== 'object') continue;
      const key = String((c as { key?: string }).key || '');
      if (!key) continue;
      dist.set(key, (dist.get(key) || 0) + 1);
    }
    const insights = (d.insights || {}) as Record<string, unknown>;
    if (typeof insights.imt === 'number') {
      imtSum += insights.imt;
      retSum += Number(insights.knowledgeRetention || 0);
      withInsights += 1;
      if (Number(insights.reviewRisk || 0) >= 0.6) risk += 1;
    }
    const recs = Array.isArray(d.recommendations) ? d.recommendations : [];
    recCount += recs.length;
  }

  const learningProfiles = await payload.find({
    collection: 'learning-profiles',
    limit: 200,
    overrideAccess: true,
  });
  const tutorUsageSessions = learningProfiles.docs.reduce(
    (s, d) => s + Number(d.aiUsageCount || 0),
    0,
  );

  await payload.updateGlobal({
    slug: 'sip-dashboard',
    data: {
      profilesCount: profiles.totalDocs,
      studentsAtRisk: risk,
      avgImt: withInsights ? Number((imtSum / withInsights).toFixed(3)) : 0,
      avgRetention: withInsights ? Number((retSum / withInsights).toFixed(3)) : 0,
      competencyDistribution: [...dist.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, count })),
      recommendationsCount: recCount,
      evidenceCount: evidence.totalDocs,
      tutorUsageSessions,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `perfis=${profiles.totalDocs} risco=${risk} evidencias=${evidence.totalDocs}`,
    },
    overrideAccess: true,
  });
}
