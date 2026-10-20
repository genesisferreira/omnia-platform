'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { MaterialType } from '@/lib/lms/material';
import type { MaterialRendererProps } from './renderers';
import { MaterialSkeleton } from '@/components/lms/material/MaterialSkeleton';

/**
 * Registry com dynamic import — code-splitting por renderer.
 */
const loading = () => <MaterialSkeleton compact />;

export const RENDERER_LOADERS: Record<
  MaterialType,
  () => Promise<{ default: ComponentType<MaterialRendererProps> }>
> = {
  text: () => import('./renderers').then((m) => ({ default: m.TextRenderer })),
  html: () => import('./renderers').then((m) => ({ default: m.HtmlRenderer })),
  image: () => import('./renderers').then((m) => ({ default: m.ImageRenderer })),
  pdf: () => import('./renderers').then((m) => ({ default: m.PdfRenderer })),
  video: () => import('./renderers').then((m) => ({ default: m.VideoRenderer })),
  external_link: () => import('./renderers').then((m) => ({ default: m.ExternalLinkRenderer })),
  file: () => import('./renderers').then((m) => ({ default: m.FileRenderer })),
  h5p: () => import('./renderers').then((m) => ({ default: m.H5pRenderer })),
  unknown: () => import('./renderers').then((m) => ({ default: m.UnknownRenderer })),
};

const cache = new Map<MaterialType, ComponentType<MaterialRendererProps>>();

export function getLazyRenderer(type: MaterialType): ComponentType<MaterialRendererProps> {
  const hit = cache.get(type);
  if (hit) return hit;
  const Comp = dynamic(RENDERER_LOADERS[type] ?? RENDERER_LOADERS.unknown, {
    loading,
    ssr: false,
  });
  cache.set(type, Comp);
  return Comp;
}
