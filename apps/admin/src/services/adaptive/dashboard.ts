import type { Payload } from 'payload';

export async function refreshAdaptiveDashboard(
  payload: Payload,
  opts?: { lastDecideMs?: number },
): Promise<void> {
  const decisions = await payload.find({
    collection: 'adaptive-decisions',
    limit: 500,
    sort: '-createdAt',
    overrideAccess: true,
  });

  const byType = new Map<string, number>();
  const byCourse = new Map<string, number>();
  let accepted = 0;
  let ignored = 0;
  let reviewRec = 0;
  let confSum = 0;
  const usersWithGap = new Set<string>();
  const usersNoAction = new Set<string>();

  for (const d of decisions.docs) {
    const t = String(d.actionType || '');
    byType.set(t, (byType.get(t) || 0) + 1);
    if (t === 'REVIEW_LESSON' || t === 'REVIEW_TOPIC') reviewRec += 1;
    if (d.outcome === 'accepted' || d.outcome === 'completed') accepted += 1;
    if (d.outcome === 'ignored') ignored += 1;
    confSum += Number(d.confidence || 0);
    const courseRel = d.course;
    const courseId =
      courseRel == null
        ? 'n/a'
        : typeof courseRel === 'object' && courseRel && 'id' in courseRel
          ? String((courseRel as { id: unknown }).id)
          : String(courseRel);
    byCourse.set(courseId, (byCourse.get(courseId) || 0) + 1);
    const comps = Array.isArray(d.competencyIds) ? d.competencyIds : [];
    if (comps.length) usersWithGap.add(String(d.userKey));
  }

  const prev = await payload.findGlobal({
    slug: 'adaptive-learning-dashboard',
    overrideAccess: true,
  });
  const prevAvg = Number(prev.avgDecideMs || 0);
  const avgDecideMs =
    opts?.lastDecideMs != null
      ? prevAvg
        ? Math.round(prevAvg * 0.7 + opts.lastDecideMs * 0.3)
        : opts.lastDecideMs
      : prevAvg;

  await payload.updateGlobal({
    slug: 'adaptive-learning-dashboard',
    data: {
      decisionsCount: decisions.totalDocs,
      actionsByType: [...byType.entries()].map(([key, count]) => ({ key, count })),
      acceptedCount: accepted,
      ignoredCount: ignored,
      reviewRecommendedCount: reviewRec,
      avgConfidence: decisions.docs.length
        ? Number((confSum / decisions.docs.length).toFixed(3))
        : 0,
      studentsWithGaps: usersWithGap.size,
      studentsWithoutNextAction: usersNoAction.size,
      byCourse: [...byCourse.entries()].map(([key, count]) => ({ key, count })),
      avgDecideMs,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `decisions=${decisions.totalDocs} review=${reviewRec} accepted=${accepted}`,
    },
    overrideAccess: true,
  });
}
