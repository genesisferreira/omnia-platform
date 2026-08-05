import { cache } from 'react';

import { getConfig } from '@omnia/config';

export type PublicCourseListItem = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  category: string | null;
  level: string | null;
  language: string | null;
  estimatedHours: number | null;
  featured: boolean;
  publishedAt: string | null;
  featuredImage: { id: unknown; url: string; alt: string | null } | null;
  thumbnail: { id: unknown; url: string; alt: string | null } | null;
};

export type PublicCourseDetail = {
  course: PublicCourseListItem & {
    description: unknown;
    seo: unknown;
  };
  modules: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      slug: string;
      summary: string | null;
      type: string;
      duration: number | null;
      order: number;
      externalUrl: string | null;
    }>;
  }>;
};

export type PublicLessonDetail = {
  course: { id: string; title: string; slug: string };
  module: { id: string; title: string; slug: string } | null;
  lesson: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    content: unknown;
    type: string;
    duration: number | null;
    order: number;
    externalUrl: string | null;
  };
  assets: Array<{
    id: string;
    title: string;
    description: string | null;
    assetType: string;
    order: number;
    media: { id: unknown; url: string; alt: string | null; mimeType: string | null; filename: string | null } | null;
  }>;
};

function adminBase(): string {
  return getConfig().app.adminUrl.replace(/\/$/, '');
}

function resolveMediaUrl(url: string): string {
  try {
    return new URL(url, `${adminBase()}/`).toString();
  } catch {
    return url;
  }
}

function withMediaUrl<T extends { url: string } | null>(media: T): T {
  if (!media) return media;
  return { ...media, url: resolveMediaUrl(media.url) };
}

async function getJson(pathAndQuery: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${adminBase()}/api${pathAndQuery}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const fetchPublicCourses = cache(async (args?: { page?: number; q?: string }) => {
  const page = args?.page ?? 1;
  const q = args?.q ? `&q=${encodeURIComponent(args.q)}` : '';
  const data = (await getJson(`/omnia/public-courses?page=${page}&pageSize=12${q}`)) as {
    ok?: boolean;
    items?: PublicCourseListItem[];
    total?: number;
    totalPages?: number;
    page?: number;
  } | null;
  if (!data?.ok || !Array.isArray(data.items)) {
    return { items: [] as PublicCourseListItem[], total: 0, totalPages: 0, page: 1 };
  }
  return {
    items: data.items.map((item) => ({
      ...item,
      featuredImage: withMediaUrl(item.featuredImage),
      thumbnail: withMediaUrl(item.thumbnail),
    })),
    total: data.total ?? data.items.length,
    totalPages: data.totalPages ?? 1,
    page: data.page ?? page,
  };
});

export const fetchPublicCourse = cache(async (slug: string): Promise<PublicCourseDetail | null> => {
  const data = (await getJson(`/omnia/public-course?slug=${encodeURIComponent(slug)}`)) as {
    ok?: boolean;
    course?: PublicCourseDetail['course'];
    modules?: PublicCourseDetail['modules'];
  } | null;
  if (!data?.ok || !data.course || !Array.isArray(data.modules)) return null;
  return {
    course: {
      ...data.course,
      featuredImage: withMediaUrl(data.course.featuredImage),
      thumbnail: withMediaUrl(data.course.thumbnail),
    },
    modules: data.modules,
  };
});

export const fetchPublicLesson = cache(
  async (courseSlug: string, lessonSlug: string): Promise<PublicLessonDetail | null> => {
    const data = (await getJson(
      `/omnia/public-lesson?courseSlug=${encodeURIComponent(courseSlug)}&lessonSlug=${encodeURIComponent(lessonSlug)}`,
    )) as (PublicLessonDetail & { ok?: boolean }) | null;
    if (!data?.ok || !data.lesson) return null;
    return {
      ...data,
      assets: (data.assets ?? []).map((a) => ({
        ...a,
        media: withMediaUrl(a.media),
      })),
    };
  },
);
