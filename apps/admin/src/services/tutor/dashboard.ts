import type { Payload } from 'payload';

export async function refreshTutorDashboard(payload: Payload): Promise<void> {
  const [students, learning, plans, sessions, feedbackUp, feedbackDown] =
    await Promise.all([
      payload.find({ collection: 'student-profiles', limit: 200, overrideAccess: true }),
      payload.find({ collection: 'learning-profiles', limit: 200, overrideAccess: true }),
      payload.find({ collection: 'tutor-study-plans', limit: 1, overrideAccess: true }),
      payload.find({
        collection: 'ai-sessions',
        limit: 300,
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

  const avgProgressPercent = students.docs.length
    ? Number(
        (
          students.docs.reduce((s, d) => s + Number(d.progressPercent || 0), 0) /
          students.docs.length
        ).toFixed(1),
      )
    : 0;

  const questionFreq = new Map<string, number>();
  for (const s of sessions.docs) {
    const q = String(s.question || '').trim().slice(0, 100);
    if (!q) continue;
    questionFreq.set(q, (questionFreq.get(q) || 0) + 1);
  }
  const topQuestions = [...questionFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([question, count]) => ({ question, count }));

  const topicFreq = new Map<string, number>();
  for (const lp of learning.docs) {
    for (const t of Array.isArray(lp.pendingTopics) ? lp.pendingTopics : []) {
      const key = String(t);
      topicFreq.set(key, (topicFreq.get(key) || 0) + 1);
    }
    for (const t of Array.isArray(lp.masteredTopics) ? lp.masteredTopics : []) {
      const key = String(t);
      topicFreq.set(key, (topicFreq.get(key) || 0) + 1);
    }
  }
  const topTopics = [...topicFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, count]) => ({ topic, count }));

  const up = feedbackUp.totalDocs;
  const down = feedbackDown.totalDocs;
  const totalFb = up + down;
  const avgFeedbackScore = totalFb ? Number(((up - down) / totalFb).toFixed(3)) : 0;

  const recommendationsCount = learning.docs.reduce(
    (s, d) => s + Number(d.aiUsageCount || 0),
    0,
  );

  await payload.updateGlobal({
    slug: 'neurofrigo-tutor-dashboard',
    data: {
      avgProgressPercent,
      tutorAskCount: sessions.totalDocs,
      topQuestions,
      topTopics,
      recommendationsCount,
      studyPlansCount: plans.totalDocs,
      avgFeedbackScore,
      learningProfilesCount: learning.totalDocs,
      studentProfilesCount: students.totalDocs,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `tutor=${sessions.totalDocs} plans=${plans.totalDocs} progress=${avgProgressPercent}%`,
    },
    overrideAccess: true,
  });
}
