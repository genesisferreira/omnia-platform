import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload';

type ErrorBody = {
  ok: false;
  error: { code: 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR'; message: string };
};

const json = (status: number, body: unknown, cache = true): Response =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': cache ? 'public, s-maxage=60, stale-while-revalidate=120' : 'no-store',
    },
  });

const badRequest = () =>
  json(
    400,
    {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'Parâmetros inválidos.' },
    } satisfies ErrorBody,
    false,
  );

const notFound = (message: string) =>
  json(404, { ok: false, error: { code: 'NOT_FOUND', message } } satisfies ErrorBody);

const internalError = () =>
  json(
    500,
    {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Não foi possível carregar o catálogo.' },
    } satisfies ErrorBody,
    false,
  );

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function mediaDto(value: unknown) {
  if (!isRecord(value)) return null;
  const url = typeof value.url === 'string' ? value.url : null;
  if (!url) return null;
  return {
    id: value.id ?? null,
    url,
    alt: typeof value.alt === 'string' ? value.alt : null,
    mimeType: typeof value.mimeType === 'string' ? value.mimeType : null,
    filename: typeof value.filename === 'string' ? value.filename : null,
  };
}

function relationId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (isRecord(value) && (typeof value.id === 'string' || typeof value.id === 'number')) {
    return value.id;
  }
  return null;
}

async function loadPublishedCourseBySlug(req: PayloadRequest, slug: string) {
  const result = await req.payload.find({
    collection: 'courses' as CollectionSlug,
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: 'published' } },
        { visibility: { equals: 'public' } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}

/** GET /omnia/public-courses — lista cursos publicados. */
export const publicCoursesEndpoint: Endpoint = {
  path: '/omnia/public-courses',
  method: 'get',
  handler: async (req) => {
    try {
      const url = new URL(req.url || 'http://localhost');
      const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
      const pageSize = Math.min(
        50,
        Math.max(1, Number(url.searchParams.get('pageSize') || 12) || 12),
      );
      const q = url.searchParams.get('q')?.trim() || null;

      const and: Where[] = [
        { status: { equals: 'published' } },
        { visibility: { equals: 'public' } },
      ];
      if (q) {
        and.push({
          or: [
            { title: { contains: q } },
            { shortDescription: { contains: q } },
            { category: { contains: q } },
          ],
        });
      }

      const result = await req.payload.find({
        collection: 'courses' as CollectionSlug,
        where: { and },
        page,
        limit: pageSize,
        sort: '-publishedAt',
        depth: 1,
        overrideAccess: true,
      });

      const items = result.docs.map((doc) => {
        const d = doc as Record<string, unknown>;
        return {
          id: String(d.id),
          title: d.title,
          slug: d.slug,
          shortDescription: d.shortDescription ?? null,
          category: d.category ?? null,
          level: d.level ?? null,
          language: d.language ?? null,
          estimatedHours: d.estimatedHours ?? null,
          featured: Boolean(d.featured),
          publishedAt: d.publishedAt ?? null,
          featuredImage: mediaDto(d.featuredImage),
          thumbnail: mediaDto(d.thumbnail),
        };
      });

      return json(200, {
        ok: true,
        page: result.page,
        pageSize: result.limit,
        total: result.totalDocs,
        totalPages: result.totalPages,
        items,
      });
    } catch (err) {
      req.payload.logger.error({ msg: 'public_courses_failed', err });
      return internalError();
    }
  },
};

/** GET /omnia/public-course?slug= — curso + módulos + aulas (sem assets pesados). */
export const publicCourseEndpoint: Endpoint = {
  path: '/omnia/public-course',
  method: 'get',
  handler: async (req) => {
    try {
      const url = new URL(req.url || 'http://localhost');
      const slug = url.searchParams.get('slug')?.trim();
      if (!slug) return badRequest();

      const course = await loadPublishedCourseBySlug(req, slug);
      if (!course) return notFound('Curso não encontrado.');

      const courseId = course.id;
      const modules = await req.payload.find({
        collection: 'course-modules' as CollectionSlug,
        where: {
          and: [{ course: { equals: courseId } }, { published: { equals: true } }],
        },
        sort: 'order',
        limit: 100,
        depth: 0,
        overrideAccess: true,
      });

      const moduleIds = modules.docs.map((m) => m.id);
      const lessons =
        moduleIds.length === 0
          ? { docs: [] as Record<string, unknown>[] }
          : await req.payload.find({
              collection: 'lessons' as CollectionSlug,
              where: {
                and: [{ module: { in: moduleIds } }, { published: { equals: true } }],
              },
              sort: 'order',
              limit: 500,
              depth: 0,
              overrideAccess: true,
            });

      const lessonsByModule = new Map<string, Record<string, unknown>[]>();
      for (const lesson of lessons.docs as Record<string, unknown>[]) {
        const mid = String(relationId(lesson.module));
        const list = lessonsByModule.get(mid) ?? [];
        list.push(lesson);
        lessonsByModule.set(mid, list);
      }

      const c = course as Record<string, unknown>;
      return json(200, {
        ok: true,
        course: {
          id: String(c.id),
          title: c.title,
          slug: c.slug,
          shortDescription: c.shortDescription ?? null,
          description: c.description ?? null,
          category: c.category ?? null,
          level: c.level ?? null,
          language: c.language ?? null,
          estimatedHours: c.estimatedHours ?? null,
          featured: Boolean(c.featured),
          publishedAt: c.publishedAt ?? null,
          featuredImage: mediaDto(c.featuredImage),
          thumbnail: mediaDto(c.thumbnail),
          seo: isRecord(c.seo) ? c.seo : null,
        },
        modules: modules.docs.map((mod) => {
          const m = mod as Record<string, unknown>;
          const id = String(m.id);
          return {
            id,
            title: m.title,
            slug: m.slug,
            description: m.description ?? null,
            order: m.order,
            lessons: (lessonsByModule.get(id) ?? []).map((lesson) => ({
              id: String(lesson.id),
              title: lesson.title,
              slug: lesson.slug,
              summary: lesson.summary ?? null,
              type: lesson.type,
              duration: lesson.duration ?? null,
              order: lesson.order,
              externalUrl: lesson.externalUrl ?? null,
            })),
          };
        }),
      });
    } catch (err) {
      req.payload.logger.error({ msg: 'public_course_failed', err });
      return internalError();
    }
  },
};

/** GET /omnia/public-lesson?courseSlug=&lessonSlug= — aula + materiais. */
export const publicLessonEndpoint: Endpoint = {
  path: '/omnia/public-lesson',
  method: 'get',
  handler: async (req) => {
    try {
      const url = new URL(req.url || 'http://localhost');
      const courseSlug = url.searchParams.get('courseSlug')?.trim();
      const lessonSlug = url.searchParams.get('lessonSlug')?.trim();
      if (!courseSlug || !lessonSlug) return badRequest();

      const course = await loadPublishedCourseBySlug(req, courseSlug);
      if (!course) return notFound('Curso não encontrado.');

      const modules = await req.payload.find({
        collection: 'course-modules' as CollectionSlug,
        where: {
          and: [{ course: { equals: course.id } }, { published: { equals: true } }],
        },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      });
      const moduleIds = modules.docs.map((m) => m.id);
      if (moduleIds.length === 0) return notFound('Aula não encontrada.');

      const lessons = await req.payload.find({
        collection: 'lessons' as CollectionSlug,
        where: {
          and: [
            { slug: { equals: lessonSlug } },
            { module: { in: moduleIds } },
            { published: { equals: true } },
          ],
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });
      const lesson = lessons.docs[0] as Record<string, unknown> | undefined;
      if (!lesson) return notFound('Aula não encontrada.');

      const assets = await req.payload.find({
        collection: 'lesson-assets' as CollectionSlug,
        where: { lesson: { equals: lesson.id } },
        sort: 'order',
        limit: 100,
        depth: 1,
        overrideAccess: true,
      });

      const moduleDoc = modules.docs.find(
        (m) => String(m.id) === String(relationId(lesson.module)),
      );

      return json(200, {
        ok: true,
        course: {
          id: String(course.id),
          title: (course as Record<string, unknown>).title,
          slug: (course as Record<string, unknown>).slug,
        },
        module: moduleDoc
          ? {
              id: String(moduleDoc.id),
              title: (moduleDoc as Record<string, unknown>).title,
              slug: (moduleDoc as Record<string, unknown>).slug,
            }
          : null,
        lesson: {
          id: String(lesson.id),
          title: lesson.title,
          slug: lesson.slug,
          summary: lesson.summary ?? null,
          content: lesson.content ?? null,
          type: lesson.type,
          duration: lesson.duration ?? null,
          order: lesson.order,
          externalUrl: lesson.externalUrl ?? null,
        },
        assets: assets.docs.map((a) => {
          const row = a as Record<string, unknown>;
          return {
            id: String(row.id),
            title: row.title,
            description: row.description ?? null,
            assetType: row.assetType,
            order: row.order,
            media: mediaDto(row.media),
          };
        }),
      });
    } catch (err) {
      req.payload.logger.error({ msg: 'public_lesson_failed', err });
      return internalError();
    }
  },
};
