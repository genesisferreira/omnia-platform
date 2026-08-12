'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { MaterialNav } from '@/components/lms/material/MaterialNav';
import { MaterialProvider } from '@/components/lms/material/MaterialProvider';
import { MaterialViewer } from '@/components/lms/material/MaterialViewer';
import {
  buildMaterialsFromLesson,
  findMaterialNeighbors,
  type MaterialDescriptor,
} from '@/lib/lms/material';
import type { LessonActivity } from '@/lib/lms/lesson-nav';
import { lessonHref } from '@/lib/lms/lesson-nav';

export type MaterialExperienceProps = {
  courseId: number;
  activity: LessonActivity;
  sectionId?: number | null;
  sectionSummary?: string | null;
  /** Prefetch da próxima aula (Lesson Experience). */
  nextActivityId?: number | null;
};

function MaterialExperienceInner(props: MaterialExperienceProps) {
  const router = useRouter();
  const materials = useMemo(
    () =>
      buildMaterialsFromLesson({
        courseId: props.courseId,
        activity: props.activity,
        sectionId: props.sectionId,
        sectionSummary: props.sectionSummary,
        lastAccessedAt: new Date().toISOString(),
      }),
    [props.courseId, props.activity, props.sectionId, props.sectionSummary],
  );

  const [currentId, setCurrentId] = useState(materials[0]?.id ?? '');
  useEffect(() => {
    if (materials[0] && !materials.some((m) => m.id === currentId)) {
      setCurrentId(materials[0].id);
    }
  }, [materials, currentId]);

  const { current, prev, next } = findMaterialNeighbors(materials, currentId);
  const currentMaterial: MaterialDescriptor | null = current;

  useEffect(() => {
    if (next) {
      // pré-carrega renderer do próximo tipo
      void import('@/components/lms/material/renderers/registry').then((m) => {
        m.getLazyRenderer(next.type);
      });
    }
    if (props.nextActivityId) {
      router.prefetch(lessonHref(props.courseId, props.nextActivityId));
    }
  }, [next, props.nextActivityId, props.courseId, router]);

  const onSelect = useCallback((id: string) => setCurrentId(id), []);

  if (!currentMaterial) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Nenhum material disponível nesta aula.
      </p>
    );
  }

  return (
    <div className="space-y-4" aria-label="Experiência de materiais">
      {materials.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          Material {materials.findIndex((m) => m.id === currentId) + 1} de {materials.length}
        </p>
      ) : null}
      <MaterialViewer key={currentMaterial.id} descriptor={currentMaterial} trackLifecycle />
      <MaterialNav
        courseId={props.courseId}
        activityId={props.activity.moodleActivityId}
        sectionId={props.sectionId}
        prev={prev}
        next={next}
        onSelectMaterial={onSelect}
      />
    </div>
  );
}

/** Host oficial da Material Experience (Provider + Viewer + Nav). */
export function MaterialExperience(props: MaterialExperienceProps) {
  return (
    <MaterialProvider>
      <MaterialExperienceInner {...props} />
    </MaterialProvider>
  );
}
