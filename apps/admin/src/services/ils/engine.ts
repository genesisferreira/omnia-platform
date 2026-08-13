import {
  CAREER_GOALS,
  DOMAIN_LABELS,
  SCHOOL_BRANDS,
  TECHNICAL_DOMAINS,
  academicAccessAllowed,
  applyAssessmentGuard,
  applyOnboardingTransition,
  applySipeEvent,
  assertSchoolAccess,
  attentionSignals,
  blueprintsEquivalent,
  canUseInOfficialAssessment,
  computeImt,
  filterTutorContext,
  humanizeResult,
  isSchoolKey,
  nextAdaptiveQuestion,
  nextOnboardingStep,
  overallTechnicalLevel,
  promoteExercise,
  requireOverrideReason,
  resolveSchoolKey,
  sanitizeCareerGoals,
  sanitizePcar,
  schoolAiContext,
  schoolLabel,
  tutorAllowedContextKeys,
  validateBlueprint,
  validateGeneratedExercise,
  type BankQuestion,
  type Blueprint,
  type CompetencySnapshot,
  type DomainEstimate,
  type OnboardingStatus,
  type SchoolKey,
  type SipeEventType,
} from '@omnia/intelligent-learning';
import type { CollectionSlug, Payload, Where } from 'payload';

import { AcademicError, isAdmin, isTeacher, relId } from '../academic/engine';
import type { LmsAuthContext } from '../lms/auth-context';

const ONBOARDING = 'ils-onboarding' as CollectionSlug;
const CONSENTS = 'ils-consents' as CollectionSlug;
const HISTORY = 'ils-competency-history' as CollectionSlug;
const INTERVENTIONS = 'ils-interventions' as CollectionSlug;
const EXERCISES = 'ils-generated-exercises' as CollectionSlug;
const BLUEPRINTS = 'ils-assessment-blueprints' as CollectionSlug;
const AUDIT = 'ils-audit-events' as CollectionSlug;
const ENROLLMENTS = 'lms-enrollments' as CollectionSlug;
const COURSES = 'courses' as CollectionSlug;
const CLASSES = 'lms-classes' as CollectionSlug;
const ATTEMPTS = 'lms-attempts' as CollectionSlug;
const PROGRESS = 'lms-lesson-progress' as CollectionSlug;
const CERTS = 'lms-certificates' as CollectionSlug;
const ASSESSMENTS = 'lms-assessments' as CollectionSlug;
const COMPANIES = 'companies' as CollectionSlug;
const QUESTIONS = 'lms-questions' as CollectionSlug;

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
}

function userIdNum(auth: LmsAuthContext): number {
  const n = Number(auth.omniaUserId);
  if (!Number.isFinite(n)) throw new AcademicError(400, 'BAD_REQUEST', 'user id inválido');
  return n;
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

export const CONSENT_TEXT_VERSION = 'ils-onboarding-v1';

export async function resolveActorSchool(
  payload: Payload,
  auth: LmsAuthContext,
): Promise<SchoolKey | null> {
  const sid = userIdNum(auth);
  const enrollments = await findDocs(payload, ENROLLMENTS, { student: { equals: sid } }, 1, 20);
  for (const row of enrollments) {
    const fromRow = isSchoolKey(row.schoolKey) ? row.schoolKey : null;
    if (fromRow) return fromRow;
    const courseId = relId(row.course);
    if (!courseId) continue;
    const course = rec(
      await payload
        .findByID({ collection: COURSES, id: courseId, depth: 1, overrideAccess: true })
        .catch(() => null),
    );
    const key = resolveSchoolKey({
      schoolKey: course.schoolKey,
      brandTheme: rec(course.ownerCompany).brandTheme,
      slug: rec(course.ownerCompany).slug,
      portalSlug: rec(course.ownerCompany).portalSlug,
    });
    if (key) return key;
  }
  return null;
}

function denyCrossSchool(
  resource: SchoolKey | null,
  actor: SchoolKey | null,
  auth: LmsAuthContext,
) {
  const check = assertSchoolAccess({
    resourceSchool: resource,
    actorSchool: actor,
    isAdmin: isAdmin(auth),
  });
  if (!check.ok) throw new AcademicError(403, 'CROSS_SCHOOL', 'Recurso de outra escola');
}

async function audit(
  payload: Payload,
  input: {
    actor?: number | null;
    student?: number | null;
    schoolKey?: SchoolKey | null;
    action: string;
    reason?: string;
    source?: string;
    previousJson?: unknown;
    nextJson?: unknown;
  },
) {
  await payload.create({
    collection: AUDIT,
    data: {
      actor: input.actor ?? null,
      student: input.student ?? null,
      schoolKey: input.schoolKey ?? null,
      action: input.action,
      reason: input.reason ?? null,
      source: input.source ?? 'ils',
      previousJson: input.previousJson ?? null,
      nextJson: input.nextJson ?? null,
    } as never,
    overrideAccess: true,
  });
}

async function getOrCreateOnboarding(
  payload: Payload,
  studentId: number,
  schoolKey: SchoolKey | null,
) {
  const existing = await findDocs(payload, ONBOARDING, { student: { equals: studentId } }, 0, 1);
  if (existing[0]) return existing[0];
  const enrollments = await findDocs(
    payload,
    ENROLLMENTS,
    { student: { equals: studentId } },
    0,
    20,
  );
  const legacy = enrollments.some(
    (e) => Number(e.progressPercent || 0) > 0 || e.status === 'completed' || e.lastLessonId,
  );
  return rec(
    await payload.create({
      collection: ONBOARDING,
      data: {
        student: studentId,
        schoolKey: schoolKey ?? null,
        status: legacy ? 'EXEMPTED' : 'NOT_STARTED',
        currentStep: legacy ? 'result' : 'explanation',
        exemptedReason: legacy ? 'Aluno legado do LMS Core (pré-ILS)' : null,
        exemptedAt: legacy ? new Date().toISOString() : null,
      } as never,
      overrideAccess: true,
    }),
  );
}

export async function ilsContext(payload: Payload, auth: LmsAuthContext) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const studentId = userIdNum(auth);
  const onboarding =
    auth.role === 'student' ? await getOrCreateOnboarding(payload, studentId, schoolKey) : null;
  const status = (onboarding?.status as OnboardingStatus | undefined) ?? 'EXEMPTED';
  const brand = schoolKey ? SCHOOL_BRANDS[schoolKey] : null;
  return {
    schoolKey,
    schoolName: schoolLabel(schoolKey),
    brand,
    onboardingStatus: auth.role === 'student' ? status : 'EXEMPTED',
    academicAllowed: auth.role === 'student' ? academicAccessAllowed(status) : true,
    currentStep: onboarding?.currentStep ?? 'result',
  };
}

export async function getOnboarding(payload: Payload, auth: LmsAuthContext) {
  if (isTeacher(auth) && !isAdmin(auth) && auth.role !== 'student') {
    throw new AcademicError(403, 'FORBIDDEN', 'Onboarding é do aluno');
  }
  const schoolKey = await resolveActorSchool(payload, auth);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  const status = (row.status as OnboardingStatus) || 'NOT_STARTED';
  const pcar = row.pcar && typeof row.pcar === 'object' ? rec(row.pcar) : null;
  const goals = row.goals && typeof row.goals === 'object' ? rec(row.goals) : null;
  const hasConsent = Boolean(row.consentId);
  const step = nextOnboardingStep({
    status,
    hasConsent,
    hasPcar: Boolean(pcar),
    hasGoals: Boolean(goals),
    hasAssessment: rec(row.assessmentState).complete === true,
  });
  return {
    id: row.id,
    status,
    currentStep: step,
    schoolKey: isSchoolKey(row.schoolKey) ? row.schoolKey : schoolKey,
    schoolName: schoolLabel(isSchoolKey(row.schoolKey) ? row.schoolKey : schoolKey),
    academicAllowed: academicAccessAllowed(status),
    pcar,
    goals,
    consentVersion: CONSENT_TEXT_VERSION,
    assessment: row.assessmentState ?? null,
    result: academicAccessAllowed(status) ? humanizeFromState(row) : null,
  };
}

function humanizeFromState(row: Rec) {
  const estimates = (rec(row.assessmentState).estimates as DomainEstimate[]) || [];
  const overall = overallTechnicalLevel(estimates);
  const ranked = [...estimates].sort((a, b) => b.score - a.score);
  const goals = rec(row.goals);
  const goalList = Array.isArray(goals.goals) ? (goals.goals as string[]) : [];
  return humanizeResult({
    strengths: ranked.filter((e) => e.score >= 60).map((e) => DOMAIN_LABELS[e.domain] || e.domain),
    developments: ranked
      .filter((e) => e.score < 60)
      .reverse()
      .map((e) => DOMAIN_LABELS[e.domain] || e.domain),
    goal: goalList[0] ?? null,
  });
}

export async function startOnboarding(payload: Payload, auth: LmsAuthContext) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  const next = applyOnboardingTransition(
    (row.status as OnboardingStatus) || 'NOT_STARTED',
    'start',
  );
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: { status: next, currentStep: 'consent', schoolKey: schoolKey ?? row.schoolKey } as never,
    overrideAccess: true,
  });
  await audit(payload, {
    actor: userIdNum(auth),
    student: userIdNum(auth),
    schoolKey,
    action: 'onboarding_started',
  });
  return getOnboarding(payload, auth);
}

export async function recordConsent(payload: Payload, auth: LmsAuthContext) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const studentId = userIdNum(auth);
  const consent = rec(
    await payload.create({
      collection: CONSENTS,
      data: {
        user: studentId,
        schoolKey: schoolKey ?? null,
        purpose: 'educational_onboarding',
        textVersion: CONSENT_TEXT_VERSION,
        accepted: true,
        acceptedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
    }),
  );
  const row = await getOrCreateOnboarding(payload, studentId, schoolKey);
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: {
      consentId: Number(consent.id),
      status: 'IN_PROGRESS',
      currentStep: 'pcar',
    } as never,
    overrideAccess: true,
  });
  await audit(payload, {
    actor: studentId,
    student: studentId,
    schoolKey,
    action: 'consent_accepted',
    nextJson: { textVersion: CONSENT_TEXT_VERSION },
  });
  return getOnboarding(payload, auth);
}

export async function savePcar(
  payload: Payload,
  auth: LmsAuthContext,
  raw: Record<string, unknown>,
) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const pcar = sanitizePcar(raw);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: { pcar, currentStep: 'goals', status: 'IN_PROGRESS' } as never,
    overrideAccess: true,
  });
  return getOnboarding(payload, auth);
}

export async function saveGoals(
  payload: Payload,
  auth: LmsAuthContext,
  raw: { goals?: unknown; notes?: unknown },
) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const goals = sanitizeCareerGoals(raw.goals, raw.notes);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: { goals, currentStep: 'assessment', status: 'IN_PROGRESS' } as never,
    overrideAccess: true,
  });
  return getOnboarding(payload, auth);
}

function seedBank(): BankQuestion[] {
  return TECHNICAL_DOMAINS.flatMap((domain) =>
    ([1, 2, 3] as const).map((d) => ({
      id: `${domain}-${d}`,
      domain,
      difficulty: d,
      type: 'true_false' as const,
    })),
  );
}

function domainPrompt(q: BankQuestion): string {
  const label = DOMAIN_LABELS[q.domain];
  const level = q.difficulty === 1 ? 'básico' : q.difficulty === 3 ? 'avançado' : 'intermediário';
  return `Sobre ${label} (${level}): em operação real, segurança e interpretação técnica devem anteceder qualquer atalho. Esta afirmação é verdadeira?`;
}

export async function assessmentNext(payload: Payload, auth: LmsAuthContext) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  const state = rec(row.assessmentState);
  const answers = Array.isArray(state.answers)
    ? (state.answers as Array<{ questionId: string; correct: boolean }>)
    : [];
  const bank = seedBank();
  const nxt = nextAdaptiveQuestion(bank, answers);
  if (nxt.complete) {
    return {
      complete: true,
      estimates: nxt.estimates,
      overall: overallTechnicalLevel(nxt.estimates),
    };
  }
  return {
    complete: false,
    question: nxt.question
      ? {
          id: nxt.question.id,
          domain: nxt.question.domain,
          domainLabel: DOMAIN_LABELS[nxt.question.domain],
          difficulty: nxt.question.difficulty,
          prompt: domainPrompt(nxt.question),
          type: nxt.question.type,
        }
      : null,
    estimates: nxt.estimates.map((e) => ({
      domain: e.domain,
      label: DOMAIN_LABELS[e.domain],
      done: e.done,
      evidenceCount: e.evidenceCount,
    })),
  };
}

export async function assessmentAnswer(
  payload: Payload,
  auth: LmsAuthContext,
  input: { questionId: string; value: unknown },
) {
  const schoolKey = await resolveActorSchool(payload, auth);
  const row = await getOrCreateOnboarding(payload, userIdNum(auth), schoolKey);
  const state = rec(row.assessmentState);
  const answers = Array.isArray(state.answers)
    ? ([...state.answers] as Array<{ questionId: string; correct: boolean }>)
    : [];
  const bank = seedBank();
  const q = bank.find((b) => b.id === input.questionId);
  if (!q) throw new AcademicError(400, 'BAD_REQUEST', 'Questão inválida');
  const value = String(input.value ?? '').toLowerCase();
  const correct = value === 'true' || value === 'verdadeiro' || value === '1' || value === 'sim';
  answers.push({ questionId: q.id, correct });
  const nxt = nextAdaptiveQuestion(bank, answers);
  const overall = overallTechnicalLevel(nxt.estimates);
  const complete = nxt.complete;
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: {
      assessmentState: {
        answers,
        estimates: nxt.estimates,
        overall,
        complete,
      },
      status: complete ? 'COMPLETED' : 'IN_PROGRESS',
      currentStep: complete ? 'result' : 'assessment',
      completedAt: complete ? new Date().toISOString() : null,
    } as never,
    overrideAccess: true,
  });
  if (complete) {
    for (const est of nxt.estimates) {
      if (est.evidenceCount > 0) {
        await recordSipe(payload, {
          type: 'INITIAL_ASSESSMENT_COMPLETED',
          studentId: userIdNum(auth),
          schoolKey,
          competencyKey: est.domain,
          score: est.score,
        });
      }
    }
    await audit(payload, {
      actor: userIdNum(auth),
      student: userIdNum(auth),
      schoolKey,
      action: 'initial_assessment_completed',
      nextJson: overall,
    });
  }
  return assessmentNext(payload, auth);
}

export async function recordSipe(
  payload: Payload,
  event: {
    type: SipeEventType;
    studentId: number;
    schoolKey: SchoolKey | null;
    courseId?: number | null;
    competencyKey?: string | null;
    score?: number | null;
    sourceId?: string | null;
  },
) {
  const at = new Date().toISOString();
  const rows = await findDocs(payload, HISTORY, { student: { equals: event.studentId } }, 0, 200);
  const latestByKey = new Map<string, CompetencySnapshot>();
  for (const r of rows) {
    const key = String(r.competencyKey || '');
    if (!key) continue;
    const snap: CompetencySnapshot = {
      key,
      score: Number(r.score || 0),
      confidence: Number(r.confidence || 0),
      evidenceCount: Number(r.evidenceCount || 0),
      updatedAt: String(r.snapshotAt || r.updatedAt || at),
    };
    const prev = latestByKey.get(key);
    if (!prev || snap.updatedAt >= prev.updatedAt) latestByKey.set(key, snap);
  }
  const applied = applySipeEvent([...latestByKey.values()], {
    type: event.type,
    at,
    studentId: event.studentId,
    schoolKey: event.schoolKey,
    courseId: event.courseId,
    competencyKey: event.competencyKey,
    score: event.score,
    sourceId: event.sourceId,
  });
  if (applied.changed) {
    await payload.create({
      collection: HISTORY,
      data: {
        student: event.studentId,
        schoolKey: event.schoolKey,
        competencyKey: applied.changed.key,
        score: applied.changed.score,
        confidence: applied.changed.confidence,
        evidenceCount: applied.changed.evidenceCount,
        sourceEvent: event.type,
        previousScore: latestByKey.get(applied.changed.key)?.score ?? null,
        snapshotAt: at,
      } as never,
      overrideAccess: true,
    });
  }
  return applied;
}

export async function student360(
  payload: Payload,
  auth: LmsAuthContext,
  studentId: number,
  schoolHint?: SchoolKey | null,
) {
  const actorSchool = await resolveActorSchool(payload, auth);
  const self = userIdNum(auth) === studentId;
  if (!self && !isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Student 360 restrito');
  }
  const enrollments = await findDocs(
    payload,
    ENROLLMENTS,
    { student: { equals: studentId } },
    1,
    50,
  );
  const schoolKey =
    schoolHint ||
    (enrollments.map((e) => e.schoolKey).find(isSchoolKey) as SchoolKey | undefined) ||
    actorSchool;
  if (!self) denyCrossSchool(schoolKey, actorSchool, auth);

  const progress = await findDocs(payload, PROGRESS, { student: { equals: studentId } }, 0, 200);
  const attempts = await findDocs(payload, ATTEMPTS, { student: { equals: studentId } }, 0, 100);
  const certs = await findDocs(payload, CERTS, { student: { equals: studentId } }, 0, 50);
  const onboarding = (
    await findDocs(payload, ONBOARDING, { student: { equals: studentId } }, 0, 1)
  )[0];
  const histRows = await findDocs(payload, HISTORY, { student: { equals: studentId } }, 0, 200);
  const interventions =
    isTeacher(auth) || isAdmin(auth)
      ? await findDocs(payload, INTERVENTIONS, { student: { equals: studentId } }, 0, 50)
      : [];

  const latest = new Map<string, CompetencySnapshot>();
  const evolution: Array<{ key: string; from: number | null; to: number; at: string }> = [];
  for (const r of histRows) {
    const key = String(r.competencyKey || '');
    const snap: CompetencySnapshot = {
      key,
      score: Number(r.score || 0),
      confidence: Number(r.confidence || 0),
      evidenceCount: Number(r.evidenceCount || 0),
      updatedAt: String(r.snapshotAt || ''),
    };
    const prev = latest.get(key);
    if (prev) {
      evolution.push({ key, from: prev.score, to: snap.score, at: snap.updatedAt });
    } else if (r.previousScore != null) {
      evolution.push({
        key,
        from: Number(r.previousScore),
        to: snap.score,
        at: snap.updatedAt,
      });
    }
    latest.set(key, snap);
  }

  const completedLessons = progress.filter((p) => p.completed === true).length;
  const avgProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((s, e) => s + Number(e.progressPercent || 0), 0) / enrollments.length,
      )
    : 0;
  const lastAcademic = [
    ...progress.map((p) => String(p.updatedAt || '')),
    ...attempts.map((a) => String(a.updatedAt || '')),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);
  const inactiveDays = lastAcademic
    ? Math.floor((Date.now() - new Date(lastAcademic).getTime()) / 86400000)
    : null;
  const pending = await findDocs(payload, ASSESSMENTS, { status: { equals: 'published' } }, 0, 50);
  const signals = attentionSignals({
    incompleteActivities: Math.max(0, pending.length - attempts.length),
    inactiveDays,
  });
  const estimates = (rec(onboarding?.assessmentState).estimates as DomainEstimate[]) || [];
  const competencies = [...latest.values()];
  const imt = computeImt(competencies);
  const pcar = onboarding?.pcar ? sanitizePcar(rec(onboarding.pcar)) : null;
  const goals = onboarding?.goals
    ? sanitizeCareerGoals(rec(onboarding.goals).goals)
    : { goals: [], notes: null };
  const ranked = [...estimates].sort((a, b) => b.score - a.score);
  const ux = humanizeResult({
    strengths: ranked.filter((e) => e.score >= 60).map((e) => DOMAIN_LABELS[e.domain]),
    developments: [...ranked].reverse().map((e) => DOMAIN_LABELS[e.domain]),
    goal: goals.goals[0] ?? null,
  });
  const gaps = competencies.filter((c) => c.score < 55).map((c) => c.key);
  return {
    identity: { studentId, schoolKey, displayName: null, schoolName: schoolLabel(schoolKey) },
    baseline: {
      pcar,
      goals: goals.goals,
      initialOverall: estimates.length ? overallTechnicalLevel(estimates).overall : null,
      domains: estimates,
    },
    academic: {
      enrollments: enrollments.length,
      progressPercent: avgProgress,
      completedLessons,
      publishedGrades: attempts.filter((a) => a.status === 'published').length,
      certificates: certs.length,
    },
    competencies,
    evolution: evolution.slice(-20),
    learning: {
      recommendations: gaps.slice(0, 3).map((g) => `Reforço formativo em ${g}`),
      interventions: interventions.length,
      interventionsList: interventions.map((i) => ({
        id: i.id,
        action: i.action,
        reason: i.reason,
        outcome: i.outcome,
      })),
    },
    engagement: { lastAcademicAt: lastAcademic ?? null, inactiveDays },
    attention: signals,
    imt,
    result: ux,
    ai: {
      allowedContext: tutorAllowedContextKeys(),
      schoolPolicy: schoolAiContext(schoolKey),
      context: filterTutorContext({
        school: schoolKey,
        course: enrollments[0] ? relId(enrollments[0].course) : null,
        progress: avgProgress,
        competenceGaps: gaps,
        goals: goals.goals,
        explanationPreference: pcar?.explanationPreference,
        priorEvidenceSummary: `${competencies.length} competências com histórico`,
      }),
    },
  };
}

export async function classIntelligence(payload: Payload, auth: LmsAuthContext, classId: number) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  const cls = rec(
    await payload
      .findByID({ collection: CLASSES, id: classId, depth: 0, overrideAccess: true })
      .catch(() => null),
  );
  if (!cls.id) throw new AcademicError(404, 'NOT_FOUND', 'Turma não encontrada');
  const actorSchool = await resolveActorSchool(payload, auth);
  const classSchool = isSchoolKey(cls.schoolKey) ? cls.schoolKey : actorSchool;
  denyCrossSchool(classSchool, actorSchool, auth);
  if (!isAdmin(auth) && relId(cls.instructor) !== userIdNum(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Turma não autorizada');
  }
  const roster = await findDocs(payload, ENROLLMENTS, { classRef: { equals: classId } }, 0, 100);
  const students = await Promise.all(
    roster.map(async (e) => {
      const sid = relId(e.student);
      if (!sid) return null;
      const hist = await findDocs(payload, HISTORY, { student: { equals: sid } }, 0, 50);
      const low = hist.filter((h) => Number(h.score) < 55);
      return {
        studentId: sid,
        progressPercent: Number(e.progressPercent || 0),
        status: e.status,
        lowCompetencies: [...new Set(low.map((h) => String(h.competencyKey)))],
      };
    }),
  );
  const compact = students.filter(Boolean);
  return {
    classId,
    schoolKey: classSchool,
    studentCount: compact.length,
    avgProgress: compact.length
      ? Math.round(compact.reduce((s, x) => s + (x?.progressPercent || 0), 0) / compact.length)
      : 0,
    studentsNeedingSupport: compact.filter((s) => (s?.lowCompetencies.length || 0) > 0),
    inactive: compact.filter((s) => (s?.progressPercent || 0) === 0),
  };
}

export async function createIntervention(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    studentId: number;
    courseId?: number | null;
    classId?: number | null;
    action: string;
    reason: string;
    suggestedByAi?: boolean;
  },
) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  if (!input.reason || input.reason.trim().length < 8) {
    throw new AcademicError(400, 'BAD_REQUEST', 'Motivo pedagógico obrigatório');
  }
  const schoolKey = await resolveActorSchool(payload, auth);
  const doc = rec(
    await payload.create({
      collection: INTERVENTIONS,
      data: {
        actor: userIdNum(auth),
        student: input.studentId,
        course: input.courseId ?? null,
        classRef: input.classId ?? null,
        schoolKey,
        reason: input.reason.trim(),
        action: input.action || 'observation',
        suggestedByAi: input.suggestedByAi === true,
      } as never,
      overrideAccess: true,
    }),
  );
  await recordSipe(payload, {
    type: 'INTERVENTION_CREATED',
    studentId: input.studentId,
    schoolKey,
    courseId: input.courseId,
  });
  await audit(payload, {
    actor: userIdNum(auth),
    student: input.studentId,
    schoolKey,
    action: 'intervention_created',
    reason: input.reason,
    nextJson: { id: doc.id, action: input.action },
  });
  return { intervention: doc };
}

export async function adminOverview(
  payload: Payload,
  auth: LmsAuthContext,
  schoolKey?: SchoolKey | null,
) {
  if (!isAdmin(auth)) throw new AcademicError(403, 'FORBIDDEN', 'Somente admin');
  const where: Where = schoolKey ? { schoolKey: { equals: schoolKey } } : {};
  const onboardings = await findDocs(payload, ONBOARDING, where, 0, 200);
  const enrollments = await findDocs(payload, ENROLLMENTS, where, 0, 200);
  const interventions = await findDocs(payload, INTERVENTIONS, where, 0, 100);
  const completed = onboardings.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'EXEMPTED',
  ).length;
  return {
    schoolKey: schoolKey ?? null,
    onboarding: {
      total: onboardings.length,
      completed,
      inProgress: onboardings.filter((o) => o.status === 'IN_PROGRESS').length,
    },
    enrollments: enrollments.length,
    avgProgress: enrollments.length
      ? Math.round(
          enrollments.reduce((s, e) => s + Number(e.progressPercent || 0), 0) / enrollments.length,
        )
      : 0,
    interventions: interventions.length,
    companies: await findDocs(payload, COMPANIES, {}, 0, 20).then((rows) =>
      rows
        .map((c) => ({
          id: c.id,
          name: c.name,
          schoolKey: resolveSchoolKey({
            schoolKey: c.schoolKey,
            brandTheme: c.brandTheme,
            slug: c.slug,
            portalSlug: c.portalSlug,
          }),
        }))
        .filter((c) => c.schoolKey),
    ),
  };
}

export async function createExerciseDraft(
  payload: Payload,
  auth: LmsAuthContext,
  input: {
    prompt: string;
    type?: string;
    competencyKey: string;
    difficulty?: string;
    expectedAnswer?: string;
    studentId?: number;
    courseId?: number;
    lessonId?: number;
  },
) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  const schoolKey = await resolveActorSchool(payload, auth);
  const draft = {
    exerciseId: `draft-${Date.now()}`,
    competencies: [input.competencyKey],
    difficulty: (input.difficulty as 'beginner') || 'beginner',
    type: (input.type as 'short_answer') || 'short_answer',
    prompt: input.prompt,
    expectedAnswer: input.expectedAnswer ?? null,
    rubric: null,
    explanation: null,
    sourceRefs: [],
    generationMetadata: {
      schoolKey,
      studentId: input.studentId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      model: 'rule-template',
    },
    status: 'GENERATED' as const,
  };
  const check = validateGeneratedExercise(draft);
  if (!check.ok) throw new AcademicError(400, 'INVALID_EXERCISE', check.errors.join(','));
  const doc = rec(
    await payload.create({
      collection: EXERCISES,
      data: {
        schoolKey,
        course: input.courseId ?? null,
        lesson: input.lessonId ?? null,
        student: input.studentId ?? null,
        instructor: userIdNum(auth),
        status: 'GENERATED',
        type: draft.type,
        difficulty: draft.difficulty,
        prompt: draft.prompt,
        expectedAnswer: draft.expectedAnswer,
        competencies: draft.competencies,
        generationMetadata: draft.generationMetadata,
      } as never,
      overrideAccess: true,
    }),
  );
  await audit(payload, {
    actor: userIdNum(auth),
    student: input.studentId ?? null,
    schoolKey,
    action: 'exercise_generated',
    nextJson: { id: doc.id, status: 'GENERATED' },
  });
  return { exercise: doc, officialEligible: canUseInOfficialAssessment('GENERATED') };
}

export async function validateExercise(
  payload: Payload,
  auth: LmsAuthContext,
  id: number,
  action: 'validate' | 'publish' | 'reject',
) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  const doc = rec(
    await payload.findByID({ collection: EXERCISES, id, overrideAccess: true }).catch(() => null),
  );
  if (!doc.id) throw new AcademicError(404, 'NOT_FOUND', 'Exercício não encontrado');
  const next = promoteExercise(String(doc.status) as 'GENERATED', action);
  await payload.update({
    collection: EXERCISES,
    id,
    data: {
      status: next,
      validatedBy: userIdNum(auth),
      validatedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  });
  return { id, status: next, officialEligible: canUseInOfficialAssessment(next) };
}

export async function saveBlueprint(
  payload: Payload,
  auth: LmsAuthContext,
  raw: Blueprint & { title: string },
) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  const check = validateBlueprint(raw);
  if (!check.ok) throw new AcademicError(400, 'INVALID_BLUEPRINT', check.errors.join(','));
  const schoolKey = await resolveActorSchool(payload, auth);
  const doc = rec(
    await payload.create({
      collection: BLUEPRINTS,
      data: {
        title: raw.title,
        version: raw.version,
        schoolKey,
        instructor: userIdNum(auth),
        official: true,
        competencies: raw.competencies,
        difficulty: raw.difficulty,
        questionCount: raw.questionCount,
        timeLimitMinutes: raw.timeLimitMinutes,
        passingScore: raw.passingScore,
        allowedTypes: raw.allowedTypes,
      } as never,
      overrideAccess: true,
    }),
  );
  await audit(payload, {
    actor: userIdNum(auth),
    schoolKey,
    action: 'assessment_blueprint_saved',
    nextJson: { id: doc.id, version: raw.version },
  });
  return { blueprint: doc, equivalentToSelf: blueprintsEquivalent(raw, raw) };
}

export async function exemptOnboarding(
  payload: Payload,
  auth: LmsAuthContext,
  studentId: number,
  reason: unknown,
) {
  if (!isTeacher(auth) && !isAdmin(auth)) {
    throw new AcademicError(403, 'FORBIDDEN', 'Somente professor/admin');
  }
  const why = requireOverrideReason(reason);
  const schoolKey = await resolveActorSchool(payload, auth);
  const row = await getOrCreateOnboarding(payload, studentId, schoolKey);
  await payload.update({
    collection: ONBOARDING,
    id: Number(row.id),
    data: {
      status: 'EXEMPTED',
      currentStep: 'result',
      exemptedBy: userIdNum(auth),
      exemptedReason: why,
      exemptedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  });
  await audit(payload, {
    actor: userIdNum(auth),
    student: studentId,
    schoolKey,
    action: 'onboarding_exempted',
    reason: why,
    previousJson: { status: row.status },
    nextJson: { status: 'EXEMPTED' },
  });
  return { status: 'EXEMPTED', reason: why };
}

export function tutorGuardForAsk(input: {
  question: string;
  officialAssessmentActive: boolean;
  schoolKey: SchoolKey | null;
}) {
  const guard = applyAssessmentGuard({
    question: input.question,
    officialAssessmentActive: input.officialAssessmentActive,
    schoolKey: input.schoolKey,
  });
  return {
    ...guard,
    schoolPolicy: schoolAiContext(input.schoolKey),
  };
}

export { CAREER_GOALS, TECHNICAL_DOMAINS };
