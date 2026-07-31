'use client';

import { useEffect } from 'react';

import { writeLastSeen } from '@/lib/lms/continue';

export function TrackLastSeen(props: {
  omniaUserId: string;
  courseId: number;
  activityId?: number | null;
  sectionId?: number | null;
}) {
  useEffect(() => {
    writeLastSeen(props.omniaUserId, {
      courseId: props.courseId,
      activityId: props.activityId ?? null,
      sectionId: props.sectionId ?? null,
      updatedAt: new Date().toISOString(),
    });
  }, [props.omniaUserId, props.courseId, props.activityId, props.sectionId]);

  return null;
}
