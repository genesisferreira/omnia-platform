'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { AssessmentType } from '@omnia/assessment-engine';

import { Skeleton } from '@omnia/ui';
import type { AssessmentRendererProps } from './renderers';

const loading = () => <Skeleton className="h-24 w-full" aria-hidden />;

export const ASSESSMENT_RENDERER_LOADERS: Record<
  AssessmentType,
  () => Promise<{ default: ComponentType<AssessmentRendererProps> }>
> = {
  quiz: () => import('./renderers').then((m) => ({ default: m.QuizRenderer })),
  assignment: () => import('./renderers').then((m) => ({ default: m.AssignmentRenderer })),
  unknown: () => import('./renderers').then((m) => ({ default: m.UnknownAssessmentRenderer })),
};

const cache = new Map<AssessmentType, ComponentType<AssessmentRendererProps>>();

export function getLazyAssessmentRenderer(
  type: AssessmentType,
): ComponentType<AssessmentRendererProps> {
  const hit = cache.get(type);
  if (hit) return hit;
  const Comp = dynamic(ASSESSMENT_RENDERER_LOADERS[type] ?? ASSESSMENT_RENDERER_LOADERS.unknown, {
    loading,
    ssr: false,
  });
  cache.set(type, Comp);
  return Comp;
}

export const FeedbackRendererLazy = dynamic(
  () => import('./renderers').then((m) => ({ default: m.FeedbackRenderer })),
  { loading, ssr: false },
);
export const GradeRendererLazy = dynamic(
  () => import('./renderers').then((m) => ({ default: m.GradeRenderer })),
  { loading, ssr: false },
);
export const CompletionRendererLazy = dynamic(
  () => import('./renderers').then((m) => ({ default: m.CompletionRenderer })),
  { loading, ssr: false },
);
