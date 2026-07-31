/**
 * Funções Moodle REST permitidas (read-only) — Moodle 4.5.x.
 * O BFF nunca aceita nome de função arbitrário do cliente.
 */
export const MOODLE_READ_FUNCTIONS = {
  siteInfo: 'core_webservice_get_site_info',
  getUsersByField: 'core_user_get_users_by_field',
  getUserCourses: 'core_enrol_get_users_courses',
  getCourses: 'core_course_get_courses',
  getCoursesByField: 'core_course_get_courses_by_field',
  getCourseContents: 'core_course_get_contents',
  getActivitiesCompletion: 'core_completion_get_activities_completion_status',
  getCourseCompletion: 'core_completion_get_course_completion_status',
  getGradeItems: 'gradereport_user_get_grade_items',
} as const;

export type MoodleReadFunction =
  (typeof MOODLE_READ_FUNCTIONS)[keyof typeof MOODLE_READ_FUNCTIONS];

export const MOODLE_READ_FUNCTION_SET = new Set<string>(Object.values(MOODLE_READ_FUNCTIONS));

/** Funções idempotentes elegíveis a retry. */
export const IDEMPOTENT_MOODLE_FUNCTIONS = new Set<string>(Object.values(MOODLE_READ_FUNCTIONS));
