'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildAssessmentDescriptor, isAssessmentMod } from '@omnia/assessment-engine';

import { AssessmentNav } from '@/components/lms/assessment/AssessmentNav';
import { AssessmentProvider } from '@/components/lms/assessment/AssessmentProvider';
import { AssessmentViewer } from '@/components/lms/assessment/AssessmentViewer';
import type { FlatLesson, LessonActivity } from '@/lib/lms/lesson-nav';
import { lessonHref } from '@/lib/lms/lesson-nav';

export type AssessmentExperienceProps = {
  courseId: number;
  activity: LessonActivity;
  sectionId?: number | null;
  sectionSummary?: string | null;
  progressState?: number;
  timeCompleted?: string | null;
  grade?: {
    itemName: string;
    gradeFormatted: string | null;
    percentage: number | null;
  } | null;
  prev: FlatLesson | null;
  next: FlatLesson | null;
};

function AssessmentExperienceInner(props: AssessmentExperienceProps) {
  const router = useRouter();
  const descriptor = useMemo(
    () =>
      buildAssessmentDescriptor({
        courseId: props.courseId,
        activityId: props.activity.moodleActivityId,
        sectionId: props.sectionId,
        name: props.activity.name,
        modName: props.activity.modName,
        visible: props.activity.visible,
        sectionSummary: props.sectionSummary,
        progressState: props.progressState,
        timeCompleted: props.timeCompleted,
        grade: props.grade,
      }),
    [props],
  );

  useEffect(() => {
    if (props.next) {
      router.prefetch(lessonHref(props.courseId, props.next.activityId));
    }
  }, [router, props.courseId, props.next]);

  return (
    <div className="space-y-4" aria-label="Experiência de avaliação">
      <AssessmentViewer descriptor={descriptor} />
      <AssessmentNav
        courseId={props.courseId}
        activityId={props.activity.moodleActivityId}
        sectionId={props.sectionId}
        prev={props.prev}
        next={props.next}
      />
    </div>
  );
}

export function AssessmentExperience(props: AssessmentExperienceProps) {
  if (!isAssessmentMod(props.activity.modName)) return null;
  return (
    <AssessmentProvider>
      <AssessmentExperienceInner {...props} />
    </AssessmentProvider>
  );
}

export { isAssessmentMod };
