'use client';

import Link from 'next/link';
import { Button } from '@omnia/ui';

import {
  courseHref,
  lessonHref,
  moduleHref,
  type FlatLesson,
} from '@/lib/lms/lesson-nav';

export type LessonNavProps = {
  courseId: number;
  sectionId: number;
  prev: FlatLesson | null;
  next: FlatLesson | null;
  nextHighlighted?: boolean;
};

export function LessonNav(props: LessonNavProps) {
  return (
    <nav
      aria-label="Navegação entre aulas"
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={courseHref(props.courseId)}>Voltar ao curso</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={moduleHref(props.courseId, props.sectionId)}>Ir para módulo</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.prev ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={lessonHref(props.courseId, props.prev.activityId)}
              prefetch
              rel="prev"
            >
              Aula anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Aula anterior
          </Button>
        )}
        {props.next ? (
          <Button
            asChild
            variant={props.nextHighlighted ? 'default' : 'outline'}
            size="sm"
            className={props.nextHighlighted ? 'ring-2 ring-primary/40 ring-offset-2' : undefined}
          >
            <Link
              href={lessonHref(props.courseId, props.next.activityId)}
              prefetch
              rel="next"
            >
              Próxima aula
              {props.nextHighlighted ? `: ${props.next.name}` : ''}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima aula
          </Button>
        )}
      </div>
    </nav>
  );
}
