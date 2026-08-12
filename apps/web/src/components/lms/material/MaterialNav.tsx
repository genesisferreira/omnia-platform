'use client';

import Link from 'next/link';
import { Button } from '@omnia/ui';

import { courseHref, lessonHref, moduleHref } from '@/lib/lms/lesson-nav';
import type { MaterialDescriptor } from '@/lib/lms/material';

export type MaterialNavProps = {
  courseId: number;
  activityId: number;
  sectionId?: number | null;
  prev: MaterialDescriptor | null;
  next: MaterialDescriptor | null;
  onSelectMaterial: (id: string) => void;
};

export function MaterialNav(props: MaterialNavProps) {
  return (
    <nav
      aria-label="Navegação de materiais"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={lessonHref(props.courseId, props.activityId)}>Voltar para aula</Link>
        </Button>
        {props.sectionId != null ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={moduleHref(props.courseId, props.sectionId)}>Voltar para módulo</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link href={courseHref(props.courseId)}>Voltar para curso</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!props.prev}
          onClick={() => props.prev && props.onSelectMaterial(props.prev.id)}
        >
          Material anterior
          {props.prev ? `: ${props.prev.metadata.name}` : ''}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={!props.next}
          onClick={() => props.next && props.onSelectMaterial(props.next.id)}
        >
          Próximo material
          {props.next ? `: ${props.next.metadata.name}` : ''}
        </Button>
      </div>
    </nav>
  );
}
