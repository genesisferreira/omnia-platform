'use client';

import { Spinner } from '@omnia/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';

export function ContinueClient(props: {
  omniaUserId: string;
  courses: Array<{ moodleCourseId: number }>;
}) {
  const router = useRouter();
  const engine = useLearningEngine();

  useEffect(() => {
    if (engine.omniaUserId !== props.omniaUserId) {
      router.replace('/lms/cursos');
      return;
    }
    const target = engine.resolveContinue(props.courses);
    if (!target) {
      router.replace('/lms/cursos');
      return;
    }
    if (target.activityId) {
      router.replace(`/lms/cursos/${target.courseId}/atividades/${target.activityId}`);
    } else {
      router.replace(`/lms/cursos/${target.courseId}`);
    }
  }, [engine, props.omniaUserId, props.courses, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner label="Abrindo de onde você parou" />
      <p className="text-sm text-muted-foreground">Preparando sua última aula…</p>
    </div>
  );
}
