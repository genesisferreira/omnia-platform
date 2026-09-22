/** Constantes do LMS Core (catálogo Payload nativo — não Moodle). */

export const COURSE_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_VISIBILITIES = ['public', 'authenticated', 'company'] as const;
export type CourseVisibility = (typeof COURSE_VISIBILITIES)[number];

export const LESSON_TYPES = ['video', 'pdf', 'text', 'download', 'external_link'] as const;
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

export const CLASS_STATUSES = ['draft', 'open', 'running', 'closed', 'archived'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const CLASS_MODALITIES = ['online', 'in_person', 'hybrid'] as const;
export type ClassModality = (typeof CLASS_MODALITIES)[number];

export const ENROLLMENT_STATUSES = ['invited', 'active', 'completed', 'cancelled'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer', 'essay'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export const ASSESSMENT_STATUSES = ['draft', 'published', 'closed'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ATTEMPT_STATUSES = ['in_progress', 'submitted', 'graded', 'published'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const CERTIFICATE_STATUSES = ['valid', 'revoked'] as const;

export const ACADEMIC_EVENT_TYPES = [
  'lesson',
  'assessment',
  'deadline',
  'class_session',
  'other',
] as const;

export const NOTIFICATION_TYPES = [
  'assessment_available',
  'deadline',
  'grade_published',
  'new_material',
  'certificate_available',
] as const;

export function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}
