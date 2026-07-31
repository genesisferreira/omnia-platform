'use client';

import { useEffect } from 'react';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';

export function TrackLastSeen(props: {
  omniaUserId: string;
  courseId: number;
  activityId?: number | null;
  sectionId?: number | null;
}) {
  const engine = useLearningEngine();

  useEffect(() => {
    if (engine.omniaUserId !== props.omniaUserId) return;
    if (props.activityId) {
      engine.openLesson(props.courseId, props.activityId, props.sectionId ?? null);
    } else {
      engine.openCourse(props.courseId);
    }
  }, [engine, props.omniaUserId, props.courseId, props.activityId, props.sectionId]);

  return null;
}
