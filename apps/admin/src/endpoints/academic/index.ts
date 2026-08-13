import type { Endpoint, PayloadRequest } from 'payload';

import { requireLmsAuth, type LmsAuthContext } from '../../services/lms/auth-context';
import {
  AcademicError,
  closeAssessment,
  completeLesson,
  createAssessment,
  createClass,
  createLesson,
  createQuestion,
  enrollStudent,
  getEnrolledCourse,
  getEnrolledLesson,
  gradeManual,
  listCalendar,
  listCertificates,
  listClassRoster,
  listMyCourses,
  listNotifications,
  listPendingAttempts,
  listStudentAssessments,
  listStudentGrades,
  listTeachingAssessments,
  markNotificationRead,
  openAssessment,
  publishGrade,
  startAttempt,
  studentDashboard,
  submitAttempt,
  teacherDashboard,
  teachingBanks,
  teachingCourses,
  verifyCertificate,
} from '../../services/academic/engine';

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function ok(body: unknown, status = 200) {
  return json(status, { ok: true, ...rec(body) });
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : { data: v };
}

function fail(err: unknown): Response {
  if (err instanceof AcademicError) {
    return json(err.status, { ok: false, error: { code: err.code, message: err.message } });
  }
  const message = err instanceof Error ? err.message : 'Erro acadêmico';
  return json(500, { ok: false, error: { code: 'INTERNAL_ERROR', message } });
}

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  const raw = (await req.json?.().catch(() => null)) as unknown;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function auth(req: PayloadRequest): LmsAuthContext {
  return requireLmsAuth(req);
}

const studentDashboardEp: Endpoint = {
  path: '/omnia/academic/dashboard',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ dashboard: await studentDashboard(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const myCoursesEp: Endpoint = {
  path: '/omnia/academic/courses',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listMyCourses(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const courseBySlugEp: Endpoint = {
  path: '/omnia/academic/courses/:slug',
  method: 'get',
  handler: async (req) => {
    try {
      const slug = String(req.routeParams?.slug || '');
      return ok(await getEnrolledCourse(req.payload, auth(req), slug));
    } catch (err) {
      return fail(err);
    }
  },
};

const lessonEp: Endpoint = {
  path: '/omnia/academic/courses/:slug/lessons/:lessonSlug',
  method: 'get',
  handler: async (req) => {
    try {
      return ok(
        await getEnrolledLesson(
          req.payload,
          auth(req),
          String(req.routeParams?.slug || ''),
          String(req.routeParams?.lessonSlug || ''),
        ),
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const completeLessonEp: Endpoint = {
  path: '/omnia/academic/lessons/:id/complete',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await completeLesson(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const assessmentsEp: Endpoint = {
  path: '/omnia/academic/assessments',
  method: 'get',
  handler: async (req) => {
    try {
      const items = await listStudentAssessments(req.payload, auth(req));
      return ok({
        items: items.map((a) => ({
          id: a.id,
          title: a.title,
          dueAt: a.dueAt ?? null,
          courseId: a.course,
        })),
      });
    } catch (err) {
      return fail(err);
    }
  },
};

const assessmentOpenEp: Endpoint = {
  path: '/omnia/academic/assessments/:id',
  method: 'get',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await openAssessment(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const assessmentStartEp: Endpoint = {
  path: '/omnia/academic/assessments/:id/start',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await startAttempt(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const assessmentSubmitEp: Endpoint = {
  path: '/omnia/academic/assessments/:id/submit',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      const body = await readBody(req);
      const answers = Array.isArray(body.answers) ? body.answers : [];
      return ok(
        await submitAttempt(
          req.payload,
          auth(req),
          id,
          answers as Array<{ questionId: number; value: string | string[] | null }>,
        ),
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const gradesEp: Endpoint = {
  path: '/omnia/academic/grades',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listStudentGrades(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const certsEp: Endpoint = {
  path: '/omnia/academic/certificates',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listCertificates(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const certVerifyEp: Endpoint = {
  path: '/omnia/academic/certificates/verify/:code',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({
        certificate: await verifyCertificate(req.payload, String(req.routeParams?.code || '')),
      });
    } catch (err) {
      return fail(err);
    }
  },
};

const calendarEp: Endpoint = {
  path: '/omnia/academic/calendar',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listCalendar(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const notifsEp: Endpoint = {
  path: '/omnia/academic/notifications',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listNotifications(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const notifReadEp: Endpoint = {
  path: '/omnia/academic/notifications/:id/read',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await markNotificationRead(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingDashEp: Endpoint = {
  path: '/omnia/academic/teaching/dashboard',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ dashboard: await teacherDashboard(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingCoursesEp: Endpoint = {
  path: '/omnia/academic/teaching/courses',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await teachingCourses(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingLessonEp: Endpoint = {
  path: '/omnia/academic/teaching/lessons',
  method: 'post',
  handler: async (req) => {
    try {
      const b = await readBody(req);
      const courseId = num(b.courseId);
      const moduleId = num(b.moduleId);
      if (!courseId || !moduleId || typeof b.title !== 'string' || typeof b.slug !== 'string') {
        return json(400, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'dados incompletos' },
        });
      }
      return ok(
        await createLesson(req.payload, auth(req), {
          courseId,
          moduleId,
          title: b.title,
          slug: b.slug,
          type: typeof b.type === 'string' ? b.type : 'text',
          summary: typeof b.summary === 'string' ? b.summary : undefined,
        }),
        201,
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingQuestionEp: Endpoint = {
  path: '/omnia/academic/teaching/questions',
  method: 'post',
  handler: async (req) => {
    try {
      const b = await readBody(req);
      const courseId = num(b.courseId);
      if (!courseId || typeof b.prompt !== 'string' || typeof b.type !== 'string') {
        return json(400, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'dados incompletos' },
        });
      }
      return ok(
        await createQuestion(req.payload, auth(req), {
          courseId,
          bankId: num(b.bankId) ?? undefined,
          prompt: b.prompt,
          type: b.type as 'multiple_choice' | 'true_false' | 'short_answer' | 'essay',
          options: (b.options as never) ?? null,
          points: num(b.points) ?? 1,
          difficulty: typeof b.difficulty === 'string' ? b.difficulty : undefined,
          competencyKey: typeof b.competencyKey === 'string' ? b.competencyKey : undefined,
        }),
        201,
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingBanksEp: Endpoint = {
  path: '/omnia/academic/teaching/questions',
  method: 'get',
  handler: async (req) => {
    try {
      return ok(await teachingBanks(req.payload, auth(req)));
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingAssessmentsListEp: Endpoint = {
  path: '/omnia/academic/teaching/assessments',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({
        items: await listTeachingAssessments(
          req.payload,
          auth(req),
          num(req.searchParams?.get?.('courseId')),
        ),
      });
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingAssessmentCloseEp: Endpoint = {
  path: '/omnia/academic/teaching/assessments/:id/close',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await closeAssessment(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingAssessmentEp: Endpoint = {
  path: '/omnia/academic/teaching/assessments',
  method: 'post',
  handler: async (req) => {
    try {
      const b = await readBody(req);
      const courseId = num(b.courseId);
      const questionIds = Array.isArray(b.questionIds)
        ? b.questionIds.map((x) => num(x)).filter((n): n is number => n != null)
        : [];
      if (!courseId || typeof b.title !== 'string' || !questionIds.length) {
        return json(400, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'dados incompletos' },
        });
      }
      return ok(
        await createAssessment(req.payload, auth(req), {
          courseId,
          title: b.title,
          questionIds,
          classId: num(b.classId) ?? undefined,
          instructions: typeof b.instructions === 'string' ? b.instructions : undefined,
          maxAttempts: num(b.maxAttempts) ?? undefined,
          timeLimitMinutes: num(b.timeLimitMinutes) ?? undefined,
          passingScore: num(b.passingScore) ?? undefined,
          dueAt: typeof b.dueAt === 'string' ? b.dueAt : undefined,
          publish: b.publish === true,
        }),
        201,
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingClassEp: Endpoint = {
  path: '/omnia/academic/teaching/classes',
  method: 'post',
  handler: async (req) => {
    try {
      const b = await readBody(req);
      const courseId = num(b.courseId);
      if (!courseId || typeof b.name !== 'string') {
        return json(400, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'dados incompletos' },
        });
      }
      return ok(
        await createClass(req.payload, auth(req), {
          name: b.name,
          courseId,
          startsAt: typeof b.startsAt === 'string' ? b.startsAt : undefined,
          endsAt: typeof b.endsAt === 'string' ? b.endsAt : undefined,
          capacity: num(b.capacity) ?? undefined,
          modality: typeof b.modality === 'string' ? b.modality : undefined,
        }),
        201,
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingRosterEp: Endpoint = {
  path: '/omnia/academic/teaching/classes/:id',
  method: 'get',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await listClassRoster(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingEnrollEp: Endpoint = {
  path: '/omnia/academic/teaching/enrollments',
  method: 'post',
  handler: async (req) => {
    try {
      const b = await readBody(req);
      const studentId = num(b.studentId);
      const courseId = num(b.courseId);
      if (!studentId || !courseId) {
        return json(400, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'dados incompletos' },
        });
      }
      return ok(
        await enrollStudent(req.payload, auth(req), {
          studentId,
          courseId,
          classId: num(b.classId) ?? undefined,
        }),
        201,
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingAttemptsEp: Endpoint = {
  path: '/omnia/academic/teaching/attempts',
  method: 'get',
  handler: async (req) => {
    try {
      return ok({ items: await listPendingAttempts(req.payload, auth(req)) });
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingGradeEp: Endpoint = {
  path: '/omnia/academic/teaching/attempts/:id/grade',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      const b = await readBody(req);
      return ok(
        await gradeManual(req.payload, auth(req), id, {
          score: num(b.score) ?? undefined,
          feedback: typeof b.feedback === 'string' ? b.feedback : undefined,
          publish: b.publish === true,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
};

const teachingPublishEp: Endpoint = {
  path: '/omnia/academic/teaching/attempts/:id/publish',
  method: 'post',
  handler: async (req) => {
    try {
      const id = num(req.routeParams?.id);
      if (!id) return json(400, { ok: false, error: { code: 'BAD_REQUEST', message: 'id' } });
      return ok(await publishGrade(req.payload, auth(req), id));
    } catch (err) {
      return fail(err);
    }
  },
};

export const academicEndpoints: Endpoint[] = [
  studentDashboardEp,
  myCoursesEp,
  courseBySlugEp,
  lessonEp,
  completeLessonEp,
  assessmentsEp,
  assessmentOpenEp,
  assessmentStartEp,
  assessmentSubmitEp,
  gradesEp,
  certsEp,
  certVerifyEp,
  calendarEp,
  notifsEp,
  notifReadEp,
  teachingDashEp,
  teachingCoursesEp,
  teachingLessonEp,
  teachingQuestionEp,
  teachingBanksEp,
  teachingAssessmentsListEp,
  teachingAssessmentCloseEp,
  teachingAssessmentEp,
  teachingClassEp,
  teachingRosterEp,
  teachingEnrollEp,
  teachingAttemptsEp,
  teachingGradeEp,
  teachingPublishEp,
];
