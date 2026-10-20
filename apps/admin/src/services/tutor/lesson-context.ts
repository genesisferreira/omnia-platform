import type { Payload } from 'payload';
import type { AuthorizedPassage } from '@omnia/neurofrigo-runtime';
import { chunkAuthorizedText } from '@omnia/neurofrigo-runtime';
import { isSchoolKey, type SchoolKey } from '@omnia/intelligent-learning';

/**
 * Load published LMS lesson text as authorized Tutor passages.
 * Does not invent Knowledge Hub approval — uses enrolled course lesson content only.
 * School isolation: course.schoolKey must match actor school (when known).
 */
export async function loadAuthorizedLessonPassages(
  payload: Payload,
  input: {
    courseId: string | number;
    lessonId?: string | number | null;
    userId?: string | null;
    schoolKey?: string | null;
  },
): Promise<AuthorizedPassage[]> {
  const courseId = Number(input.courseId);
  const lessonId = input.lessonId != null && input.lessonId !== '' ? Number(input.lessonId) : null;
  if (!Number.isFinite(courseId) || courseId <= 0) return [];

  const course = await payload
    .findByID({ collection: 'courses', id: courseId, depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!course) return [];

  const courseSchool = isSchoolKey(String((course as { schoolKey?: string }).schoolKey || ''))
    ? (String((course as { schoolKey?: string }).schoolKey) as SchoolKey)
    : null;
  const actorSchool = isSchoolKey(input.schoolKey || '') ? (input.schoolKey as SchoolKey) : null;
  if (actorSchool && courseSchool && actorSchool !== courseSchool) {
    return [];
  }

  // Enrollment gate for numeric students
  if (input.userId && /^\d+$/.test(input.userId)) {
    const enr = await payload.find({
      collection: 'lms-enrollments',
      where: {
        and: [{ student: { equals: Number(input.userId) } }, { course: { equals: courseId } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (!enr.docs[0]) return [];
  }

  let lesson: Record<string, unknown> | null = null;
  if (lessonId && Number.isFinite(lessonId)) {
    lesson = (await payload
      .findByID({ collection: 'lessons', id: lessonId, depth: 1, overrideAccess: true })
      .catch(() => null)) as Record<string, unknown> | null;
    if (lesson) {
      const mod = lesson.module;
      const modId =
        typeof mod === 'object' && mod && 'id' in mod
          ? Number((mod as { id: number }).id)
          : Number(mod);
      if (Number.isFinite(modId)) {
        const moduleDoc = await payload
          .findByID({ collection: 'course-modules', id: modId, depth: 0, overrideAccess: true })
          .catch(() => null);
        const modCourse =
          moduleDoc &&
          (typeof moduleDoc.course === 'object' && moduleDoc.course && 'id' in moduleDoc.course
            ? Number((moduleDoc.course as { id: number }).id)
            : Number(moduleDoc.course));
        if (modCourse !== courseId) lesson = null;
      }
    }
  }

  // Never dump the first course lesson as a substitute for the open lesson.
  // Missing/invalid/unpublished lesson → empty → runtime not_found (or LMS next-step).
  if (!lesson || lesson.published === false) return [];

  const title = String(lesson.title || 'Aula');
  const body = [lesson.summary, lesson.content].filter(Boolean).join('\n\n');
  const lid = String(lesson.id);
  return chunkAuthorizedText(body, {
    idPrefix: `lesson-${lid}`,
    title,
    meta: {
      courseId: String(courseId),
      lessonId: lid,
      schoolKey: courseSchool,
      sourceType: 'lms_lesson',
    },
  });
}
