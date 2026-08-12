export function computeProgressPercent(activities: Array<{ state: number }>): number {
  if (!activities.length) return 0;
  const done = activities.filter((a) => a.state === 1 || a.state === 2).length;
  return Math.round((done / activities.length) * 100);
}

export function findIncompleteActivityId(
  activities: Array<{ moodleActivityId: number; state: number }>,
): number | null {
  const hit = activities.find((a) => a.state !== 1 && a.state !== 2);
  return hit?.moodleActivityId ?? null;
}

export function progressStatus(percent: number): 'NotStarted' | 'InProgress' | 'Completed' {
  if (percent <= 0) return 'NotStarted';
  if (percent >= 100) return 'Completed';
  return 'InProgress';
}
