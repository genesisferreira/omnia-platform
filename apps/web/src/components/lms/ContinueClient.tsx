'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@omnia/ui';

import { resolveContinueTarget } from '@/lib/lms/continue';

export function ContinueClient(props: {
  omniaUserId: string;
  courses: Array<{ moodleCourseId: number }>;
}) {
  const router = useRouter();

  useEffect(() => {
    const target = resolveContinueTarget({
      omniaUserId: props.omniaUserId,
      courses: props.courses,
    });
    if (!target) {
      router.replace('/lms/cursos');
      return;
    }
    if (target.activityId) {
      router.replace(`/lms/cursos/${target.courseId}/atividades/${target.activityId}`);
    } else {
      router.replace(`/lms/cursos/${target.courseId}`);
    }
  }, [props.omniaUserId, props.courses, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner label="Abrindo de onde você parou" />
      <p className="text-sm text-muted-foreground">Preparando sua última aula…</p>
    </div>
  );
}
