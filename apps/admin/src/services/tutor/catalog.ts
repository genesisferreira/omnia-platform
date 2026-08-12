import type { Payload } from 'payload';
import type { CourseCatalog, CatalogLesson, CatalogModule } from '@omnia/neurofrigo-tutor';

function relId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'object' && value && 'id' in value) {
    return String((value as { id: string | number }).id);
  }
  return String(value);
}

/**
 * Catálogo autorizado do LMS Core (Payload) — base de recomendações e planos.
 */
export async function loadCourseCatalog(
  payload: Payload,
  courseId: string,
): Promise<CourseCatalog | null> {
  let course: { id: string | number; title?: string | null } | null = null;
  try {
    course = (await payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 0,
      overrideAccess: true,
    })) as { id: string | number; title?: string | null };
  } catch {
    const bySlug = await payload.find({
      collection: 'courses',
      where: { slug: { equals: courseId } },
      limit: 1,
      overrideAccess: true,
    });
    course = (bySlug.docs[0] as typeof course) || null;
  }
  if (!course) return null;

  const modulesRes = await payload.find({
    collection: 'course-modules',
    where: {
      and: [{ course: { equals: course.id } }, { published: { equals: true } }],
    },
    sort: 'order',
    limit: 100,
    overrideAccess: true,
  });

  const modules: CatalogModule[] = [];
  const lessons: CatalogLesson[] = [];

  for (const mod of modulesRes.docs) {
    const moduleId = String(mod.id);
    const moduleTitle = String(mod.title || '');
    const moduleOrder = Number(mod.order || 0);
    const lessonsRes = await payload.find({
      collection: 'lessons',
      where: {
        and: [{ module: { equals: mod.id } }, { published: { equals: true } }],
      },
      sort: 'order',
      limit: 100,
      overrideAccess: true,
    });

    const moduleLessons: CatalogLesson[] = lessonsRes.docs.map((lesson) => ({
      id: String(lesson.id),
      title: String(lesson.title || ''),
      slug: String(lesson.slug || ''),
      moduleId,
      moduleTitle,
      order: Number(lesson.order || 0),
      moduleOrder,
      summary: (lesson.summary as string | null) ?? null,
    }));

    modules.push({
      id: moduleId,
      title: moduleTitle,
      slug: String(mod.slug || ''),
      order: moduleOrder,
      lessons: moduleLessons,
    });
    lessons.push(...moduleLessons);
  }

  return {
    courseId: String(course.id),
    courseTitle: String(course.title || ''),
    modules,
    lessons,
  };
}

export { relId };
