/** Constantes do LMS Core (catálogo Payload nativo — não Moodle). */

export const COURSE_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_VISIBILITIES = ['public', 'authenticated', 'company'] as const;
export type CourseVisibility = (typeof COURSE_VISIBILITIES)[number];

export const LESSON_TYPES = [
  'video',
  'pdf',
  'text',
  'download',
  'external_link',
] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const LESSON_ASSET_TYPES = [
  'video',
  'pdf',
  'image',
  'slides',
  'attachment',
  'zip',
  'spreadsheet',
] as const;
export type LessonAssetType = (typeof LESSON_ASSET_TYPES)[number];

export function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}
