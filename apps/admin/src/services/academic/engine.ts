import { randomBytes } from 'node:crypto';

import { gradeAttempt, studentSafeQuestion, type NativeQuestion } from '@omnia/assessment-engine';
import { resolveSchoolKey, SCHOOL_BRANDS } from '@omnia/intelligent-learning';
import type { CollectionSlug, Payload, Where } from 'payload';

import type { LmsAuthContext } from '../lms/auth-context';

const COURSES = 'courses' as CollectionSlug;
const MODULES = 'course-modules' as CollectionSlug;
const LESSONS = 'lessons' as CollectionSlug;
const ASSETS = 'lesson-assets' as CollectionSlug;
const CLASSES = 'lms-classes' as CollectionSlug;
const ENROLLMENTS = 'lms-enrollments' as CollectionSlug;
const BANKS = 'lms-question-banks' as CollectionSlug;
const QUESTIONS = 'lms-questions' as CollectionSlug;
const ASSESSMENTS = 'lms-assessments' as CollectionSlug;
const ATTEMPTS = 'lms-attempts' as CollectionSlug;
const PROGRESS = 'lms-lesson-progress' as CollectionSlug;
const CERTS = 'lms-certificates' as CollectionSlug;
const EVENTS = 'lms-academic-events' as CollectionSlug;
const NOTIFS = 'lms-notifications' as CollectionSlug;

export class AcademicError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
}

export function relId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  const r = rec(value);
  if (typeof r.id === 'number') return r.id;
  if (typeof r.id === 'string' && /^\d+$/.test(r.id)) return Number(r.id);
  return null;
}

function userIdNum(auth: LmsAuthContext): number {
  const n = Number(auth.omniaUserId);
  if (!Number.isFinite(n)) throw new AcademicError(400, 'BAD_REQUEST', 'user id inválido');
  return n;
}

export function isTeacher(auth: LmsAuthContext): boolean {
  return auth.role === 'teacher' || auth.role === 'manager' || auth.isAdmin;
}

export function isAdmin(auth: LmsAuthContext): boolean {
  return auth.isAdmin || auth.role === 'admin';
}

async function findDocs(
  payload: Payload,
  collection: CollectionSlug,
  where: Where,
  depth = 0,
  limit = 100,
) {
  const res = await payload.find({
    collection,
    where,
    depth,
    limit,
    overrideAccess: true,
  });
  return res.docs as unknown as Rec[];
}

async function getDoc(payload: Payload, collection: CollectionSlug, id: number, depth = 0) {
  try {
    return rec(await payload.findByID({ collection, id, depth, overrideAccess: true }));
  } catch {
    return null;
  }
}

export async function assertEnrolled(
  payload: Payload,
  studentId: number,
  courseId: number,
): Promise<Rec> {
  const rows = await findDocs(payload, ENROLLMENTS, {
    and: [
      { student: { equals: studentId } },
      { course: { equals: courseId } },
      { status: { in: ['active', 'completed'] } },
    ],
  });
  const row = rows[0];
  if (!row) throw new AcademicError(403, 'FORBIDDEN', 'Matrícula não encontrada neste curso');
  return row;
}

async function assertCanTeachCourse(
  payload: Payload,
  auth: LmsAuthContext,
  courseId: number,
): Promise<Rec> {
  const course = await getDoc(payload, COURSES, courseId, 0);
  if (!course) throw new AcademicError(404, 'NOT_FOUND', 'Curso não encontrado');
  if (isAdmin(auth)) return course;
  if (relId(course.instructor) === userIdNum(auth)) return course;
  const classes = await findDocs(payload, CLASSES, {
    and: [{ course: { equals: courseId } }, { instructor: { equals: userIdNum(auth) } }],
  });
  if (!classes.length) {
    throw new AcademicError(403, 'FORBIDDEN', 'Sem autorização pedagógica neste curso');
  }
  return course;
}

async function notify(
  payload: Payload,
  input: {
    recipient: number;
    type:
      | 'assessment_available'
      | 'deadline'
      | 'grade_published'
      | 'new_material'
      | 'certificate_available';
    title: string;
    body?: string;
    href?: string;
    course?: number;
  },
) {
  await payload.create({
    collection: NOTIFS,
    data: {
      recipient: input.recipient,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      course: input.course ?? null,
      read: false,
    } as never,
    overrideAccess: true,
  });
}

async function sipEvidence(
  payload: Payload,
  input: {
    userKey: string;
    course?: number;
    sourceType: 'lms' | 'attempt' | 'assessment' | 'feedback';
    sourceId?: string;
    summary: string;
    strength: number;
    competencyKey?: string;
  },
) {
  try {
    await payload.create({
      collection: 'sip-evidence' as CollectionSlug,
      data: {
        userKey: input.userKey,
        course: input.course ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        competencyKey: input.competencyKey || 'lms.academic',
        strength: input.strength,
        confidence: 0.7,
        summary: input.summary,
        observedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
    });
  } catch {
    // SIP é evidência auxiliar — não quebra o fluxo acadêmico.
  }
}

export async function studentDashboard(payload: Payload, auth: LmsAuthContext) {
  const sid = userIdNum(auth);
  const enrollments = await findDocs(payload, ENROLLMENTS, { student: { equals: sid } }, 1, 50);
  const courseIds = enrollments.map((e) => relId(e.course)).filter((n): n is number => n != null);
  const pendingAssessments =
    courseIds.length === 0
      ? []
      : await findDocs(payload, ASSESSMENTS, {
          and: [{ course: { in: courseIds } }, { status: { equals: 'published' } }],
        });
  const grades = await findDocs(payload, ATTEMPTS, {
    and: [{ student: { equals: sid } }, { status: { equals: 'published' } }],
  });
  const certs = await findDocs(payload, CERTS, {
    and: [{ student: { equals: sid } }, { status: { equals: 'valid' } }],
  });
  const events = courseIds.length
    ? await findDocs(payload, EVENTS, { course: { in: courseIds } }, 0, 20)
    : [];
  const notifications = await findDocs(
    payload,
    NOTIFS,
    { and: [{ recipient: { equals: sid } }, { read: { equals: false } }] },
    0,
    20,
  );
  return {
    enrollments: enrollments.map(serializeEnrollment),
    pendingAssessments: pendingAssessments.map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.dueAt ?? null,
      courseId: relId(a.course),
    })),
    grades: grades.map(serializeAttemptPublic),
    certificates: certs.map(serializeCert),
    calendar: events.map(serializeEvent),
    notifications: notifications.map(serializeNotif),
    continueHref: continueHref(enrollments),
  };
}

function continueHref(enrollments: Rec[]): string | null {
  const active = enrollments.find((e) => e.status === 'active' && e.lastLessonId);
  if (active) {
    const course = rec(active.course);
    const slug = typeof course.slug === 'string' ? course.slug : null;
    if (slug) return `/aluno/cursos/${slug}`;
  }
  const first = enrollments[0];
  const slug = typeof rec(first?.course).slug === 'string' ? String(rec(first?.course).slug) : null;
  return slug ? `/aluno/cursos/${slug}` : '/aluno/cursos';
}

export async function listMyCourses(payload: Payload, auth: LmsAuthContext) {
  const rows = await findDocs(payload, ENROLLMENTS, { student: { equals: userIdNum(auth) } }, 1);
  return rows.map(serializeEnrollment);
}

export async function getEnrolledCourse(payload: Payload, auth: LmsAuthContext, slug: string) {
  const sid = userIdNum(auth);
  const courses = await findDocs(payload, COURSES, { slug: { equals: slug } }, 1, 1);
  const course = courses[0];
  if (!course) throw new AcademicError(404, 'NOT_FOUND', 'Curso não encontrado');
  const courseId = Number(course.id);
  const enrollment = await assertEnrolled(payload, sid, courseId);
  const modules = await findDocs(payload, MODULES, { course: { equals: courseId } }, 0, 100);
  modules.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const lessons = await findDocs(
    payload,
    LESSONS,
    { module: { in: modules.map((m) => Number(m.id)) } },
    0,
    200,
  );
  const progress = await findDocs(payload, PROGRESS, {
    and: [{ student: { equals: sid } }, { course: { equals: courseId } }],
  });
  const done = new Set(progress.filter((p) => p.completed).map((p) => relId(p.lesson)));
  const assessments = await findDocs(payload, ASSESSMENTS, {
    and: [{ course: { equals: courseId } }, { status: { equals: 'published' } }],
  });
  return {
    course: serializeCourse(course),
    enrollment: serializeEnrollment(enrollment),
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      order: m.order ?? 0,
      lessons: lessons
        .filter((l) => relId(l.module) === Number(m.id))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          type: l.type,
          order: l.order ?? 0,
          completed: done.has(Number(l.id)),
        })),
    })),
    assessments: assessments.map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.dueAt ?? null,
    })),
  };
}

export async function getEnrolledLesson(
  payload: Payload,
  auth: LmsAuthContext,
  courseSlug: string,
  lessonSlug: string,
) {
  const bundle = await getEnrolledCourse(payload, auth, courseSlug);
  const courseId = Number(bundle.course.id);
  const lessons = await findDocs(payload, LESSONS, { slug: { equals: lessonSlug } }, 0, 20);
  const lesson = lessons.find((l) => {
    const moduleId = relId(l.module);
    return bundle.modules.some((m) => Number(m.id) === moduleId);
  });
  if (!lesson) throw new AcademicError(404, 'NOT_FOUND', 'Aula não encontrada');
  const assets = await findDocs(payload, ASSETS, { lesson: { equals: Number(lesson.id) } }, 1);
  const flat = bundle.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleSlug: m.slug })),
  );
  const idx = flat.findIndex((l) => Number(l.id) === Number(lesson.id));
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const existingProgress = await findDocs(payload, PROGRESS, {
    and: [{ student: { equals: userIdNum(auth) } }, { lesson: { equals: Number(lesson.id) } }],
  });
  if (!existingProgress[0]) {
    await payload.create({
      collection: PROGRESS,
      data: {
        student: userIdNum(auth),
        course: courseId,
        lesson: Number(lesson.id),
        startedAt: new Date().toISOString(),
        completed: false,
      },
      overrideAccess: true,
    });
  }
  return {
    course: bundle.course,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type,
      summary: lesson.summary ?? null,
      content: lesson.content ?? null,
      completed: flat[idx]?.completed ?? false,
    },
    assets: assets.map((a) => ({
      id: a.id,
      title: a.title,
      assetType: a.assetType,
      media: mediaDto(a.media),
    })),
    prev,
    next,
    tutorContext: {
      courseId,
      courseTitle: String(bundle.course.title),
      lessonId: Number(lesson.id),
      lessonTitle: String(lesson.title),
    },
  };
}

export async function completeLesson(payload: Payload, auth: LmsAuthContext, lessonId: number) {
  const lesson = await getDoc(payload, LESSONS, lessonId, 1);
  if (!lesson) throw new AcademicError(404, 'NOT_FOUND', 'Aula não encontrada');
  const moduleDoc = rec(lesson.module);
  const courseId = relId(moduleDoc.course) ?? relId(lesson.course);
  if (!courseId) throw new AcademicError(400, 'BAD_REQUEST', 'Aula sem curso');
  await assertEnrolled(payload, userIdNum(auth), courseId);
  const existing = await findDocs(payload, PROGRESS, {
    and: [{ student: { equals: userIdNum(auth) } }, { lesson: { equals: lessonId } }],
  });
  const now = new Date().toISOString();
  if (existing[0]) {
    await payload.update({
      collection: PROGRESS,
      id: Number(existing[0].id),
      data: { completed: true, completedAt: now },
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: PROGRESS,
      data: {
        student: userIdNum(auth),
        course: courseId,
        lesson: lessonId,
        completed: true,
        startedAt: now,
        completedAt: now,
      },
      overrideAccess: true,
    });
  }
  const percent = await refreshEnrollmentProgress(payload, userIdNum(auth), courseId, lessonId);
  await sipEvidence(payload, {
    userKey: String(auth.omniaUserId),
    course: courseId,
    sourceType: 'lms',
    sourceId: `lesson:${lessonId}`,
    summary: `Aula concluída: ${String(lesson.title || lessonId)}`,
    strength: 0.4,
    competencyKey: typeof lesson.competencyKey === 'string' ? lesson.competencyKey : undefined,
  });
  await emitSipe(payload, {
    type: percent >= 100 ? 'COURSE_COMPLETED' : 'LESSON_COMPLETED',
    studentId: userIdNum(auth),
    courseId,
    competencyKey: typeof lesson.competencyKey === 'string' ? lesson.competencyKey : 'fundamentos',
    score: percent >= 100 ? 80 : 62,
  });
  if (percent >= 100) {
    await maybeIssueCertificate(payload, auth, courseId);
  }
  return { ok: true, progressPercent: percent };
}

async function refreshEnrollmentProgress(
  payload: Payload,
  studentId: number,
  courseId: number,
  lastLessonId: number,
): Promise<number> {
  const modules = await findDocs(payload, MODULES, { course: { equals: courseId } });
  const lessons = modules.length
    ? await findDocs(payload, LESSONS, {
        module: { in: modules.map((m) => Number(m.id)) },
      })
    : [];
  const progress = await findDocs(payload, PROGRESS, {
    and: [{ student: { equals: studentId } }, { course: { equals: courseId } }],
  });
  const done = progress.filter((p) => p.completed).length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const enrollments = await findDocs(payload, ENROLLMENTS, {
    and: [{ student: { equals: studentId } }, { course: { equals: courseId } }],
  });
  if (enrollments[0]) {
    await payload.update({
      collection: ENROLLMENTS,
      id: Number(enrollments[0].id),
      data: {
        progressPercent: percent,
        lastLessonId,
        status: percent >= 100 ? 'completed' : enrollments[0].status,
        completedAt: percent >= 100 ? new Date().toISOString() : enrollments[0].completedAt,
      } as never,
      overrideAccess: true,
    });
  }
  return percent;
}

async function maybeIssueCertificate(payload: Payload, auth: LmsAuthContext, courseId: number) {
  const course = await getDoc(payload, COURSES, courseId);
  if (!course || course.certificateEnabled === false) return;
  const passing = Number(course.passingScore ?? 70);
  const published = await findDocs(payload, ATTEMPTS, {
    and: [
      { student: { equals: userIdNum(auth) } },
      { course: { equals: courseId } },
      { status: { equals: 'published' } },
    ],
  });
  const assessments = await findDocs(payload, ASSESSMENTS, {
    and: [{ course: { equals: courseId } }, { status: { equals: 'published' } }],
  });
  if (assessments.length) {
    const ok = assessments.every((a) => {
      const best = published
        .filter((t) => relId(t.assessment) === Number(a.id))
        .sort((x, y) => Number(y.score || 0) - Number(x.score || 0))[0];
      return best && Number(best.score || 0) >= passing;
    });
    if (!ok) return;
  }
  const existing = await findDocs(payload, CERTS, {
    and: [
      { student: { equals: userIdNum(auth) } },
      { course: { equals: courseId } },
      { status: { equals: 'valid' } },
    ],
  });
  if (existing[0]) return;
  const code = `OMN-${randomBytes(6).toString('hex').toUpperCase()}`;
  const school = resolveSchoolKey({ schoolKey: course.schoolKey });
  await payload.create({
    collection: CERTS,
    data: {
      code,
      student: userIdNum(auth),
      course: courseId,
      issuer: school ? SCHOOL_BRANDS[school].certificateIssuer : 'Omnia Frigo — LMS',
      schoolKey: school,
      status: 'valid',
      issuedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  });
  await notify(payload, {
    recipient: userIdNum(auth),
    type: 'certificate_available',
    title: 'Certificado disponível',
    body: `Seu certificado do curso ${String(course.title || '')} está pronto.`,
    href: '/aluno/certificados',
    course: courseId,
  });
}

export async function listStudentAssessments(payload: Payload, auth: LmsAuthContext) {
  const enrollments = await findDocs(payload, ENROLLMENTS, {
    student: { equals: userIdNum(auth) },
  });
  const courseIds = enrollments.map((e) => relId(e.course)).filter((n): n is number => n != null);
  if (!courseIds.length) return [];
  return findDocs(payload, ASSESSMENTS, {
    and: [{ course: { in: courseIds } }, { status: { equals: 'published' } }],
  });
}

export async function openAssessment(payload: Payload, auth: LmsAuthContext, assessmentId: number) {
  const assessment = await getDoc(payload, ASSESSMENTS, assessmentId);
  if (!assessment || assessment.status !== 'published') {
    throw new AcademicError(404, 'NOT_FOUND', 'Avaliação indisponível');
  }
  await assertEnrolled(payload, userIdNum(auth), relId(assessment.course)!);
  const ids = Array.isArray(assessment.questionIds) ? (assessment.questionIds as number[]) : [];
  const questions = ids.length ? await findDocs(payload, QUESTIONS, { id: { in: ids } }) : [];
  const ordered = ids
    .map((id) => questions.find((q) => Number(q.id) === Number(id)))
    .filter(Boolean) as Rec[];
  const pool = assessment.randomize ? [...ordered].sort(() => Math.random() - 0.5) : ordered;
  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      instructions: assessment.instructions ?? null,
      timeLimitMinutes: assessment.timeLimitMinutes ?? null,
      maxAttempts: assessment.maxAttempts ?? 1,
      dueAt: assessment.dueAt ?? null,
    },
    questions: pool.map((q) =>
      studentSafeQuestion({
        id: Number(q.id),
        type: q.type as NativeQuestion['type'],
        points: Number(q.points || 1),
        prompt: typeof q.prompt === 'string' ? q.prompt : undefined,
        options: (q.options as NativeQuestion['options']) || null,
      }),
    ),
  };
}

export async function startAttempt(payload: Payload, auth: LmsAuthContext, assessmentId: number) {
  const assessment = await getDoc(payload, ASSESSMENTS, assessmentId);
  if (!assessment || assessment.status !== 'published') {
    throw new AcademicError(404, 'NOT_FOUND', 'Avaliação indisponível');
  }
  const courseId = relId(assessment.course);
  if (!courseId) throw new AcademicError(400, 'BAD_REQUEST', 'Avaliação sem curso');
  await assertEnrolled(payload, userIdNum(auth), courseId);
  const prior = await findDocs(payload, ATTEMPTS, {
    and: [{ assessment: { equals: assessmentId } }, { student: { equals: userIdNum(auth) } }],
  });
  const max = Number(assessment.maxAttempts || 1);
  if (prior.length >= max) {
    throw new AcademicError(409, 'ATTEMPT_LIMIT', 'Limite de tentativas atingido');
  }
  const open = prior.find((p) => p.status === 'in_progress');
  if (open) return { attemptId: open.id, attemptNumber: open.attemptNumber };
  const created = rec(
    await payload.create({
      collection: ATTEMPTS,
      data: {
        assessment: assessmentId,
        student: userIdNum(auth),
        course: courseId,
        instructor: relId(assessment.instructor),
        ownerCompany: relId(assessment.ownerCompany),
        status: 'in_progress',
        attemptNumber: prior.length + 1,
        answers: [],
        startedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    }),
  );
  return { attemptId: created.id, attemptNumber: created.attemptNumber };
}

export async function submitAttempt(
  payload: Payload,
  auth: LmsAuthContext,
  assessmentId: number,
  answers: Array<{ questionId: number; value: string | string[] | null }>,
) {
  const started = await startAttempt(payload, auth, assessmentId);
  const assessment = await getDoc(payload, ASSESSMENTS, assessmentId);
  const ids = Array.isArray(assessment?.questionIds) ? (assessment!.questionIds as number[]) : [];
  const questions = ids.length ? await findDocs(payload, QUESTIONS, { id: { in: ids } }) : [];
  const native: NativeQuestion[] = questions.map((q) => ({
    id: Number(q.id),
    type: q.type as NativeQuestion['type'],
    points: Number(q.points || 1),
    options: (q.options as NativeQuestion['options']) || null,
  }));
  const graded = gradeAttempt(native, answers);
  const status = graded.needsManualGrade ? 'submitted' : 'graded';
  await payload.update({
    collection: ATTEMPTS,
    id: Number(started.attemptId),
    data: {
      answers,
      score: graded.score,
      maxScore: graded.maxScore,
      status,
      needsManualGrade: graded.needsManualGrade,
      submittedAt: new Date().toISOString(),
      gradedAt: graded.needsManualGrade ? null : new Date().toISOString(),
      feedback: graded.needsManualGrade
        ? 'Aguardando correção do professor nas questões dissertativas.'
        : 'Correção automática concluída. A nota será publicada pelo professor.',
    },
    overrideAccess: true,
  });
  const courseId = relId(assessment?.course) ?? undefined;
  await sipEvidence(payload, {
    userKey: String(auth.omniaUserId),
    course: courseId,
    sourceType: 'attempt',
    sourceId: `attempt:${started.attemptId}`,
    summary: `Tentativa enviada na avaliação ${String(assessment?.title || assessmentId)}`,
    strength: graded.score / 100,
    competencyKey:
      typeof assessment?.competencyKey === 'string' ? assessment.competencyKey : undefined,
  });
  await emitSipe(payload, {
    type: 'ASSESSMENT_ATTEMPTED',
    studentId: userIdNum(auth),
    courseId: courseId ?? null,
    competencyKey:
      typeof assessment?.competencyKey === 'string' ? assessment.competencyKey : 'fundamentos',
    score: graded.score,
  });
  return {
    attemptId: started.attemptId,
    status,
    score: graded.needsManualGrade ? null : graded.score,
    needsManualGrade: graded.needsManualGrade,
  };
}

export async function listStudentGrades(payload: Payload, auth: LmsAuthContext) {
  const rows = await findDocs(payload, ATTEMPTS, { student: { equals: userIdNum(auth) } }, 1);
  return rows.filter((r) => r.status === 'published').map(serializeAttemptPublic);
}

export async function listCertificates(payload: Payload, auth: LmsAuthContext) {
  return (await findDocs(payload, CERTS, { student: { equals: userIdNum(auth) } }, 1)).map(
    serializeCert,
  );
}

export async function verifyCertificate(payload: Payload, code: string) {
  const rows = await findDocs(payload, CERTS, { code: { equals: code.trim() } }, 1, 1);
  const cert = rows[0];
  if (!cert || cert.status !== 'valid') {
    throw new AcademicError(404, 'NOT_FOUND', 'Certificado não encontrado');
  }
  return serializeCert(cert);
}

export async function listCalendar(payload: Payload, auth: LmsAuthContext) {
  if (isTeacher(auth)) {
    const rows = await findDocs(
      payload,
      EVENTS,
      isAdmin(auth) ? {} : { instructor: { equals: userIdNum(auth) } },
      0,
      100,
    );
    return rows.map(serializeEvent);
  }
  const enrollments = await findDocs(payload, ENROLLMENTS, {
    student: { equals: userIdNum(auth) },
  });
  const courseIds = enrollments.map((e) => relId(e.course)).filter((n): n is number => n != null);
  if (!courseIds.length) return [];
  return (await findDocs(payload, EVENTS, { course: { in: courseIds } })).map(serializeEvent);
}

export async function listNotifications(payload: Payload, auth: LmsAuthContext) {
  return (await findDocs(payload, NOTIFS, { recipient: { equals: userIdNum(auth) } }, 0, 50)).map(
    serializeNotif,
  );
}

export async function markNotificationRead(payload: Payload, auth: LmsAuthContext, id: number) {
  const doc = await getDoc(payload, NOTIFS, id);
  if (!doc || relId(doc.recipient) !== userIdNum(auth)) {
    throw new AcademicError(404, 'NOT_FOUND', 'Notificação não encontrada');
  }
  await payload.update({
    collection: NOTIFS,
    id,
    data: { read: true, readAt: new Date().toISOString() },
    overrideAccess: true,
  });
  return { ok: true };
}

export async function teacherDashboard(payload: Payload, auth: LmsAuthContext) {
  if (!isTeacher(auth)) throw new AcademicError(403, 'FORBIDDEN', 'Área do professor');
  const where: Where = isAdmin(auth) ? {} : { instructor: { equals: userIdNum(auth) } };
  const classes = await findDocs(payload, CLASSES, where, 1, 50);
  const enrollments = await findDocs(payload, ENROLLMENTS, where, 0, 200);
  const pending = await findDocs(payload, ATTEMPTS, {
    and: [
      ...(isAdmin(auth) ? [] : [{ instructor: { equals: userIdNum(auth) } }]),
      { status: { in: ['submitted', 'graded'] } },
    ],
  });
  const activeStudents = new Set(
    enrollments.filter((e) => e.status === 'active').map((e) => relId(e.student)),
  );
  const avg =
    enrollments.length === 0
      ? 0
      : Math.round(
          enrollments.reduce((s, e) => s + Number(e.progressPercent || 0), 0) / enrollments.length,
        );
  const struggling = enrollments.filter(
    (e) => e.status === 'active' && Number(e.progressPercent || 0) < 40,
  );
  return {
    activeStudents: activeStudents.size,
    averageProgress: avg,
    pendingGrading: pending.length,
    struggling: struggling.length,
    classes: classes.map(serializeClass),
    nextEvents: (await listCalendar(payload, auth)).slice(0, 8),
  };
}

export async function teachingCourses(payload: Payload, auth: LmsAuthContext) {
  if (!isTeacher(auth)) throw new AcademicError(403, 'FORBIDDEN', 'Área do professor');
  const where: Where = isAdmin(auth) ? {} : { instructor: { equals: userIdNum(auth) } };
  const courses = await findDocs(payload, COURSES, where, 0, 100);
  const ids = courses.map((c) => Number(c.id));
  const modules =
    ids.length === 0 ? [] : await findDocs(payload, MODULES, { course: { in: ids } }, 0, 200);
  return courses.map((course) => ({
    ...serializeCourse(course),
    modules: modules
      .filter((m) => relId(m.course) === Number(course.id))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((m) => ({ id: m.id, title: m.title, slug: m.slug, order: m.order ?? 0 })),
  }));
}

export async function createLesson(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    courseId: number;
    moduleId: number;
    title: string;
    slug: string;
    type?: string;
    summary?: string;
    content?: unknown;
  },
) {
  await assertCanTeachCourse(payload, auth, input.courseId);
  const created = rec(
    await payload.create({
      collection: LESSONS,
      data: {
        title: input.title,
        slug: input.slug,
        module: input.moduleId,
        type: (input.type as 'text' | 'video' | 'pdf' | 'download' | 'external_link') || 'text',
        summary: input.summary ?? null,
        order: 99,
        published: false,
      } as never,
      overrideAccess: true,
    }),
  );
  return { id: created.id, slug: created.slug };
}

export async function createQuestion(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    courseId: number;
    bankId?: number;
    prompt: string;
    type: NativeQuestion['type'];
    options?: NativeQuestion['options'];
    points?: number;
    difficulty?: string;
    competencyKey?: string;
  },
) {
  const course = await assertCanTeachCourse(payload, auth, input.courseId);
  const created = rec(
    await payload.create({
      collection: QUESTIONS,
      data: {
        prompt: input.prompt,
        type: input.type,
        course: input.courseId,
        bank: input.bankId ?? null,
        instructor: userIdNum(auth),
        ownerCompany: relId(course.ownerCompany),
        options: input.options ?? null,
        points: input.points ?? 1,
        difficulty:
          input.difficulty === 'intermediate' || input.difficulty === 'advanced'
            ? input.difficulty
            : 'beginner',
        competencyKey: input.competencyKey ?? null,
      } as never,
      overrideAccess: true,
    }),
  );
  return { id: created.id };
}

export async function createAssessment(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    courseId: number;
    title: string;
    questionIds: number[];
    classId?: number;
    instructions?: string;
    maxAttempts?: number;
    timeLimitMinutes?: number;
    passingScore?: number;
    dueAt?: string;
    publish?: boolean;
  },
) {
  const course = await assertCanTeachCourse(payload, auth, input.courseId);
  const created = rec(
    await payload.create({
      collection: ASSESSMENTS,
      data: {
        title: input.title,
        course: input.courseId,
        classRef: input.classId ?? null,
        instructor: userIdNum(auth),
        ownerCompany: relId(course.ownerCompany),
        questionIds: input.questionIds,
        instructions: input.instructions ?? null,
        maxAttempts: input.maxAttempts ?? 1,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        passingScore: input.passingScore ?? 70,
        dueAt: input.dueAt ?? null,
        status: input.publish ? 'published' : 'draft',
      },
      overrideAccess: true,
    }),
  );
  if (input.publish) {
    const enrollments = await findDocs(payload, ENROLLMENTS, {
      and: [{ course: { equals: input.courseId } }, { status: { equals: 'active' } }],
    });
    for (const row of enrollments) {
      const student = relId(row.student);
      if (!student) continue;
      await notify(payload, {
        recipient: student,
        type: 'assessment_available',
        title: 'Nova avaliação disponível',
        body: input.title,
        href: `/aluno/avaliacoes`,
        course: input.courseId,
      });
    }
    if (input.dueAt) {
      await payload.create({
        collection: EVENTS,
        data: {
          title: `Prazo: ${input.title}`,
          type: 'assessment',
          course: input.courseId,
          assessment: Number(created.id),
          instructor: userIdNum(auth),
          ownerCompany: relId(course.ownerCompany),
          startsAt: input.dueAt,
        } as never,
        overrideAccess: true,
      });
    }
  }
  return { id: created.id };
}

export async function createClass(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    name: string;
    courseId: number;
    startsAt?: string;
    endsAt?: string;
    capacity?: number;
    modality?: string;
  },
) {
  const course = await assertCanTeachCourse(payload, auth, input.courseId);
  const created = rec(
    await payload.create({
      collection: CLASSES,
      data: {
        name: input.name,
        course: input.courseId,
        instructor: userIdNum(auth),
        ownerCompany: relId(course.ownerCompany),
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        capacity: input.capacity ?? null,
        modality:
          input.modality === 'in_person' || input.modality === 'hybrid' ? input.modality : 'online',
        status: 'open',
      } as never,
      overrideAccess: true,
    }),
  );
  return { id: created.id };
}

export async function enrollStudent(
  payload: Payload,
  auth: LmsAuthContext,
  input: { studentId: number; courseId: number; classId?: number },
) {
  await assertCanTeachCourse(payload, auth, input.courseId);
  const existing = await findDocs(payload, ENROLLMENTS, {
    and: [{ student: { equals: input.studentId } }, { course: { equals: input.courseId } }],
  });
  if (existing[0] && existing[0].status !== 'cancelled') {
    return { id: existing[0].id, reused: true };
  }
  const course = await getDoc(payload, COURSES, input.courseId);
  const created = rec(
    await payload.create({
      collection: ENROLLMENTS,
      data: {
        student: input.studentId,
        course: input.courseId,
        classRef: input.classId ?? null,
        instructor: userIdNum(auth),
        ownerCompany: relId(course?.ownerCompany),
        status: 'active',
        startedAt: new Date().toISOString(),
        progressPercent: 0,
      },
      overrideAccess: true,
    }),
  );
  await notify(payload, {
    recipient: input.studentId,
    type: 'new_material',
    title: 'Você foi matriculado',
    body: `Matrícula ativa em ${String(course?.title || 'curso')}.`,
    href: '/aluno/cursos',
    course: input.courseId,
  });
  return { id: created.id, reused: false };
}

export async function listClassRoster(payload: Payload, auth: LmsAuthContext, classId: number) {
  const cls = await getDoc(payload, CLASSES, classId, 1);
  if (!cls) throw new AcademicError(404, 'NOT_FOUND', 'Turma não encontrada');
  await assertCanTeachCourse(payload, auth, relId(cls.course)!);
  const rows = await findDocs(payload, ENROLLMENTS, { classRef: { equals: classId } }, 1);
  return {
    class: serializeClass(cls),
    students: rows.map(serializeEnrollment),
  };
}

export async function listPendingAttempts(payload: Payload, auth: LmsAuthContext) {
  if (!isTeacher(auth)) throw new AcademicError(403, 'FORBIDDEN', 'Área do professor');
  const where: Where = {
    and: [
      ...(isAdmin(auth) ? [] : [{ instructor: { equals: userIdNum(auth) } }]),
      { status: { in: ['submitted', 'graded'] } },
    ],
  };
  return (await findDocs(payload, ATTEMPTS, where, 1)).map(serializeAttemptTeacher);
}

export async function gradeManual(
  payload: Payload,
  auth: LmsAuthContext,
  attemptId: number,
  input: { score?: number; feedback?: string; publish?: boolean },
) {
  const attempt = await getDoc(payload, ATTEMPTS, attemptId);
  if (!attempt) throw new AcademicError(404, 'NOT_FOUND', 'Tentativa não encontrada');
  await assertCanTeachCourse(payload, auth, relId(attempt.course)!);
  const nextStatus = input.publish ? 'published' : 'graded';
  await payload.update({
    collection: ATTEMPTS,
    id: attemptId,
    data: {
      score: input.score ?? (typeof attempt.score === 'number' ? attempt.score : null),
      feedback: input.feedback ?? (typeof attempt.feedback === 'string' ? attempt.feedback : null),
      status: nextStatus,
      needsManualGrade: false,
      gradedAt: new Date().toISOString(),
      publishedAt: input.publish
        ? new Date().toISOString()
        : typeof attempt.publishedAt === 'string'
          ? attempt.publishedAt
          : null,
    } as never,
    overrideAccess: true,
  });
  if (input.publish) {
    const student = relId(attempt.student);
    if (student) {
      await notify(payload, {
        recipient: student,
        type: 'grade_published',
        title: 'Nota publicada',
        body: 'Sua avaliação recebeu nota e feedback.',
        href: '/aluno/notas',
        course: relId(attempt.course) ?? undefined,
      });
    }
  }
  return { ok: true, status: nextStatus };
}

export async function publishGrade(payload: Payload, auth: LmsAuthContext, attemptId: number) {
  return gradeManual(payload, auth, attemptId, { publish: true });
}

export async function teachingBanks(payload: Payload, auth: LmsAuthContext) {
  if (!isTeacher(auth)) throw new AcademicError(403, 'FORBIDDEN', 'Área do professor');
  const where: Where = isAdmin(auth) ? {} : { instructor: { equals: userIdNum(auth) } };
  const banks = await findDocs(payload, BANKS, where);
  const questions = await findDocs(payload, QUESTIONS, where);
  return {
    banks: banks.map((b) => ({ id: b.id, title: b.title, courseId: relId(b.course) })),
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: q.type,
      courseId: relId(q.course),
      bankId: relId(q.bank),
      difficulty: q.difficulty,
    })),
  };
}

function mediaDto(value: unknown) {
  const r = rec(value);
  const url = typeof r.url === 'string' ? r.url : null;
  if (!url) return null;
  return {
    id: r.id ?? null,
    url,
    filename: typeof r.filename === 'string' ? r.filename : null,
    mimeType: typeof r.mimeType === 'string' ? r.mimeType : null,
  };
}

function serializeCourse(course: Rec) {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription ?? null,
    level: course.level ?? null,
    estimatedHours: course.estimatedHours ?? null,
    passingScore: course.passingScore ?? 70,
    certificateEnabled: course.certificateEnabled !== false,
  };
}

function serializeEnrollment(row: Rec) {
  const course = rec(row.course);
  return {
    id: row.id,
    status: row.status,
    progressPercent: Number(row.progressPercent || 0),
    lastLessonId: row.lastLessonId ?? null,
    course: course.slug
      ? serializeCourse(course)
      : { id: relId(row.course), title: null, slug: null },
    studentId: relId(row.student),
    classId: relId(row.classRef),
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
  };
}

function serializeClass(row: Rec) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    courseId: relId(row.course),
    instructorId: relId(row.instructor),
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    capacity: row.capacity ?? null,
    modality: row.modality ?? null,
  };
}

function serializeAttemptPublic(row: Rec) {
  return {
    id: row.id,
    assessmentId: relId(row.assessment),
    status: row.status,
    score: row.status === 'published' ? (row.score ?? null) : null,
    feedback: row.status === 'published' ? (row.feedback ?? null) : null,
    submittedAt: row.submittedAt ?? null,
    publishedAt: row.publishedAt ?? null,
  };
}

function serializeAttemptTeacher(row: Rec) {
  return {
    id: row.id,
    assessmentId: relId(row.assessment),
    studentId: relId(row.student),
    status: row.status,
    score: row.score ?? null,
    feedback: row.feedback ?? null,
    needsManualGrade: !!row.needsManualGrade,
    answers: row.answers ?? [],
  };
}

function serializeCert(row: Rec) {
  const course = rec(row.course);
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    issuedAt: row.issuedAt,
    issuer: row.issuer,
    courseTitle: course.title ?? null,
    courseSlug: course.slug ?? null,
  };
}

function serializeEvent(row: Rec) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    startsAt: row.startsAt,
    endsAt: row.endsAt ?? null,
    courseId: relId(row.course),
  };
}

function serializeNotif(row: Rec) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    href: row.href ?? null,
    read: !!row.read,
    createdAt: row.createdAt ?? null,
  };
}

async function emitSipe(
  payload: Payload,
  input: {
    type: 'LESSON_COMPLETED' | 'COURSE_COMPLETED' | 'ASSESSMENT_ATTEMPTED';
    studentId: number;
    courseId?: number | null;
    competencyKey?: string | null;
    score?: number | null;
  },
) {
  try {
    const { recordSipe, resolveActorSchool } = await import('../ils/engine');
    const schoolKey = await resolveActorSchool(payload, {
      omniaUserId: String(input.studentId),
      role: 'student',
      isAdmin: false,
      via: 'internal',
    });
    await recordSipe(payload, { ...input, schoolKey });
  } catch {
    /* ILS é camada auxiliar — não quebra o LMS Core. */
  }
}
