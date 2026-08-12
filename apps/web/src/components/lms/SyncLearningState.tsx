'use client';

import { useEffect, useMemo } from 'react';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';

/** Sincroniza progresso/conclusão do Connector no Learning Engine (client). */
export function SyncLearningState(props: {
  courseId: number;
  activities?: Array<{ moodleActivityId: number; state: number }>;
  completion?: { completed: boolean; timeCompleted?: string | null } | null;
}) {
  const engine = useLearningEngine();
  const activitiesKey = useMemo(
    () => (props.activities ? JSON.stringify(props.activities) : ''),
    [props.activities],
  );
  const completionKey = useMemo(
    () => (props.completion ? JSON.stringify(props.completion) : ''),
    [props.completion],
  );

  useEffect(() => {
    if (props.activities) {
      engine.syncProgress(props.courseId, props.activities);
    }
    if (props.completion) {
      engine.syncCompletion(props.courseId, props.completion);
    }
    // Stable keys avoid re-sync loops when parent passes fresh array refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activities/completion via keys
  }, [engine, props.courseId, activitiesKey, completionKey]);

  return null;
}
