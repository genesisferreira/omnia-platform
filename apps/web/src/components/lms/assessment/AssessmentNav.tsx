'use client';

import Link from 'next/link';
import { Button } from '@omnia/ui';
import type { FlatLesson } from '@/lib/lms/lesson-nav';
import { courseHref, lessonHref, moduleHref } from '@/lib/lms/lesson-nav';

export type AssessmentNavProps = {
  courseId: number;
  activityId: number;
  sectionId?: number | null;
  prev: FlatLesson | null;
  next: FlatLesson | null;
};

export function AssessmentNav(props: AssessmentNavProps) {
  return (
    <nav
      aria-label="Navegação de atividades"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={lessonHref(props.courseId, props.activityId)}>Voltar à aula</Link>
        </Button>
        {props.sectionId != null ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={moduleHref(props.courseId, props.sectionId)}>Voltar ao módulo</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link href={courseHref(props.courseId)}>Voltar ao curso</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.prev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={lessonHref(props.courseId, props.prev.activityId)} prefetch rel="prev">
              Atividade anterior: {props.prev.name}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Atividade anterior
          </Button>
        )}
        {props.next ? (
          <Button asChild variant="default" size="sm">
            <Link href={lessonHref(props.courseId, props.next.activityId)} prefetch rel="next">
              Próxima atividade: {props.next.name}
            </Link>
          </Button>
        ) : (
          <Button variant="default" size="sm" disabled>
            Próxima atividade
          </Button>
        )}
      </div>
    </nav>
  );
}
