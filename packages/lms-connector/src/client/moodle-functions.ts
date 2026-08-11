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

export type MoodleReadFunction = (typeof MOODLE_READ_FUNCTIONS)[keyof typeof MOODLE_READ_FUNCTIONS];

export const MOODLE_READ_FUNCTION_SET = new Set<string>(Object.values(MOODLE_READ_FUNCTIONS));

/**
 * Funções Moodle REST de escrita (allowlist).
 * Runtime Sprint 3.0 força dry-run — EXECUTE_DISABLED_UNTIL_ACTIVATION.
 */
export const MOODLE_WRITE_FUNCTIONS = {
  createUsers: 'core_user_create_users',
  updateUsers: 'core_user_update_users',
  enrolUsers: 'enrol_manual_enrol_users',
  unenrolUsers: 'enrol_manual_unenrol_users',
} as const;

export type MoodleWriteFunction =
  (typeof MOODLE_WRITE_FUNCTIONS)[keyof typeof MOODLE_WRITE_FUNCTIONS];

export const MOODLE_WRITE_FUNCTION_SET = new Set<string>(Object.values(MOODLE_WRITE_FUNCTIONS));

export type MoodleWriteCapability = {
  functionName: string;
  purpose: string;
  available: boolean;
  note?: string;
};

export const MOODLE_WRITE_CAPABILITY_CATALOG: MoodleWriteCapability[] = [
  {
    functionName: MOODLE_WRITE_FUNCTIONS.createUsers,
    purpose: 'Create Moodle users',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: MOODLE_WRITE_FUNCTIONS.updateUsers,
    purpose: 'Update / suspend Moodle users',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: MOODLE_WRITE_FUNCTIONS.enrolUsers,
    purpose: 'Manual enroll users in courses',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: MOODLE_WRITE_FUNCTIONS.unenrolUsers,
    purpose: 'Manual unenroll users from courses',
    available: true,
    note: 'dry-run only until activation',
  },
];

/** Funções idempotentes elegíveis a retry. */
export const IDEMPOTENT_MOODLE_FUNCTIONS = new Set<string>(Object.values(MOODLE_READ_FUNCTIONS));
