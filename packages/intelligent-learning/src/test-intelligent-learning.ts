import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SCHOOLKEY_BACKFILL_POLICY,
  classifySchoolKeyGap,
  schoolKeyFromCompanyEvidence,
  schoolKeyFromCourseEvidence,
  schoolKeyFromUniqueEnrollmentSchools,
} from './backfill';
import { SCHOOL_KEYS, assertSchoolAccess, resolveSchoolKey, schoolsIsolated } from './schools';
import {
  academicAccessAllowed,
  applyOnboardingTransition,
  isAllowedWhileGated,
  nextOnboardingStep,
  requireOverrideReason,
} from './onboarding';
import { CAREER_GOALS, sanitizeCareerGoals, sanitizePcar } from './pcar';
import {
  TECHNICAL_DOMAINS,
  blueprintsEquivalent,
  nextAdaptiveQuestion,
  overallTechnicalLevel,
  validateBlueprint,
  type BankQuestion,
  type Blueprint,
} from './assessment';
import { applySipeEvent, type CompetencySnapshot } from './sipe';
import {
  attentionSignals,
  computeImt,
  humanizeResult,
  tutorAllowedContextKeys,
} from './student-360';
import {
  canUseInOfficialAssessment,
  generatorClassification,
  promoteExercise,
  ruleGenerateExercise,
  validateGeneratedExercise,
  type GeneratedExercise,
} from './exercises';
import { applyAssessmentGuard, filterTutorContext, schoolAiContext } from './tutor-guard';

const fredBank = (domain: BankQuestion['domain']): BankQuestion[] =>
  ([1, 2, 3] as const).map((d) => ({
    id: `${domain}-${d}`,
    domain,
    difficulty: d,
    type: 'multiple_choice' as const,
  }));

describe('intelligent learning — multi-school', () => {
  it('resolves Fred/CTE from company signals and isolates catalogs', () => {
    assert.deepEqual([...SCHOOL_KEYS], ['fred-do-frio', 'cte']);
    assert.equal(resolveSchoolKey({ brandTheme: 'fred' }), 'fred-do-frio');
    assert.equal(resolveSchoolKey({ slug: 'cte' }), 'cte');
    assert.equal(resolveSchoolKey({ schoolKey: 'cte', brandTheme: 'fred' }), 'cte');
    assert.equal(schoolsIsolated('fred-do-frio', 'cte'), true);
    assert.equal(
      assertSchoolAccess({
        resourceSchool: 'cte',
        actorSchool: 'fred-do-frio',
      }).ok,
      false,
    );
    assert.equal(
      assertSchoolAccess({
        resourceSchool: 'fred-do-frio',
        actorSchool: 'fred-do-frio',
      }).ok,
      true,
    );
    assert.equal(
      assertSchoolAccess({
        resourceSchool: 'cte',
        actorSchool: 'fred-do-frio',
        isAdmin: true,
      }).ok,
      true,
    );
  });

  it('backfills schoolKey only with evidence and leaves unknown as legacy', () => {
    assert.equal(schoolKeyFromCompanyEvidence({ brandTheme: 'fred' }), 'fred-do-frio');
    assert.equal(schoolKeyFromCompanyEvidence({ slug: 'cte' }), 'cte');
    assert.equal(schoolKeyFromCompanyEvidence({ slug: 'e16-company-a' }), null);
    assert.equal(
      schoolKeyFromCourseEvidence({ slug: 'fundamentos-refrigeracao-industrial' }),
      'fred-do-frio',
    );
    assert.equal(schoolKeyFromCourseEvidence({ slug: 'curso-sem-evidencia' }), null);
    assert.equal(
      schoolKeyFromUniqueEnrollmentSchools(['fred-do-frio', 'fred-do-frio']),
      'fred-do-frio',
    );
    assert.equal(schoolKeyFromUniqueEnrollmentSchools(['fred-do-frio', 'cte']), null);
    assert.equal(classifySchoolKeyGap(null), 'legacy_unknown');
    assert.ok(SCHOOLKEY_BACKFILL_POLICY.unknownLabel.includes('legacy'));
  });
});

describe('intelligent learning — onboarding gate', () => {
  it('blocks academic LMS until COMPLETED or EXEMPTED', () => {
    assert.equal(academicAccessAllowed('NOT_STARTED'), false);
    assert.equal(academicAccessAllowed('IN_PROGRESS'), false);
    assert.equal(academicAccessAllowed('COMPLETED'), true);
    assert.equal(academicAccessAllowed('EXEMPTED'), true);
    assert.equal(isAllowedWhileGated('/aluno/onboarding'), true);
    assert.equal(isAllowedWhileGated('/aluno/cursos'), false);
    assert.equal(applyOnboardingTransition('NOT_STARTED', 'start'), 'IN_PROGRESS');
    assert.equal(
      nextOnboardingStep({
        status: 'IN_PROGRESS',
        hasConsent: true,
        hasPcar: false,
        hasGoals: false,
        hasAssessment: false,
      }),
      'pcar',
    );
  });

  it('requires human override reason', () => {
    assert.throws(() => requireOverrideReason('ok'), /OVERRIDE_REASON_REQUIRED/);
    assert.equal(
      requireOverrideReason('Aluno já avaliado em turma presencial'),
      'Aluno já avaliado em turma presencial',
    );
  });
});

describe('intelligent learning — PCAR + goals', () => {
  it('sanitizes observable profile without clinical labels', () => {
    const pcar = sanitizePcar({
      experienceYears: 12,
      areas: ['comercial', 'tdah'],
      technicalFamiliarity: 'operacional',
      explanationPreference: 'visual',
      mathComfort: 'alta',
    });
    assert.equal(pcar.experienceYears, 12);
    assert.deepEqual(pcar.areas, ['comercial']);
    assert.ok(CAREER_GOALS.includes('co2'));
    const goals = sanitizeCareerGoals(['co2', 'abrir_empresa', 'qi'], 'quero crescer');
    assert.deepEqual(goals.goals, ['co2', 'abrir_empresa']);
  });
});

describe('intelligent learning — adaptive initial assessment', () => {
  it('selects next question deterministically and scores domains', () => {
    const bank = TECHNICAL_DOMAINS.flatMap(fredBank);
    const first = nextAdaptiveQuestion(bank, []);
    assert.ok(first.question);
    assert.equal(first.question?.difficulty, 2);
    const afterWrong = nextAdaptiveQuestion(bank, [
      { questionId: first.question!.id, correct: false },
    ]);
    assert.ok(afterWrong.question);
    assert.equal(afterWrong.question?.domain, first.question?.domain);
    assert.ok((afterWrong.question?.difficulty ?? 3) <= 2);
    const overall = overallTechnicalLevel([
      { domain: 'termodinamica', score: 40, confidence: 0.6, evidenceCount: 2, done: true },
      { domain: 'comercial', score: 80, confidence: 0.8, evidenceCount: 2, done: true },
    ]);
    assert.equal(overall.label === 'operacional' || overall.label === 'iniciante', true);
    assert.ok(overall.evidenceCount >= 4);
  });
});

describe('intelligent learning — SIPE + competencies + IMT', () => {
  it('updates competency history and withholds IMT without evidence', () => {
    const empty = computeImt([]);
    assert.equal(empty.status, 'insufficient');
    assert.equal(empty.value, null);
    let hist: CompetencySnapshot[] = [];
    const a = applySipeEvent(hist, {
      type: 'INITIAL_ASSESSMENT_COMPLETED',
      at: '2026-08-13T12:00:00.000Z',
      studentId: 1,
      schoolKey: 'fred-do-frio',
      competencyKey: 'termodinamica',
      score: 42,
    });
    hist = a.next;
    const b = applySipeEvent(hist, {
      type: 'LESSON_COMPLETED',
      at: '2026-08-13T13:00:00.000Z',
      studentId: 1,
      schoolKey: 'fred-do-frio',
      competencyKey: 'termodinamica',
      score: 70,
    });
    assert.equal(b.changed?.evidenceCount, 2);
    assert.ok((b.changed?.score ?? 0) > 42);
    const c = applySipeEvent(b.next, {
      type: 'ASSESSMENT_GRADED',
      at: '2026-08-13T14:00:00.000Z',
      studentId: 1,
      schoolKey: 'fred-do-frio',
      competencyKey: 'eletricidade',
      score: 80,
    });
    const d = applySipeEvent(c.next, {
      type: 'EXERCISE_COMPLETED',
      at: '2026-08-13T15:00:00.000Z',
      studentId: 1,
      schoolKey: 'fred-do-frio',
      competencyKey: 'eletricidade',
      score: 85,
    });
    const imt = computeImt(d.next);
    assert.equal(imt.status, 'ok');
    assert.ok(typeof imt.value === 'number');
  });
});

describe('intelligent learning — student 360 language', () => {
  it('uses evidence language and human summary', () => {
    const signals = attentionSignals({ incompleteActivities: 3, inactiveDays: 12 });
    assert.equal(signals[0]?.evidence.includes('3 atividades'), true);
    assert.equal(signals[0]?.evidence.includes('desistir'), false);
    const ux = humanizeResult({
      strengths: ['refrigeração comercial'],
      developments: ['termodinâmica aplicada'],
      goal: 'melhorar qualificação',
    });
    assert.equal(ux.summary.includes('fraco'), false);
    assert.ok(ux.summary.includes('termodinâmica'));
  });
});

describe('intelligent learning — exercises + blueprint', () => {
  it('keeps generated items out of official exams until validated', () => {
    const ex: GeneratedExercise = {
      exerciseId: 'ex-1',
      competencies: ['termodinamica'],
      difficulty: 'beginner',
      type: 'multiple_choice',
      prompt: 'O que acontece com a pressão no evaporador?',
      expectedAnswer: 'diminui',
      rubric: null,
      explanation: 'pressão cai com a evaporação',
      sourceRefs: ['kb:1'],
      generationMetadata: { schoolKey: 'fred-do-frio' },
      status: 'GENERATED',
    };
    assert.equal(validateGeneratedExercise(ex).ok, true);
    assert.equal(canUseInOfficialAssessment('GENERATED'), false);
    const thermo = ruleGenerateExercise({ competencyKey: 'termodinamica' });
    const electric = ruleGenerateExercise({ competencyKey: 'eletricidade' });
    assert.equal(generatorClassification(), 'RULE_GENERATED');
    assert.equal(thermo.generationMetadata.classification, 'RULE_GENERATED');
    assert.notEqual(thermo.prompt, electric.prompt);
    assert.ok(thermo.sourceRefs.length > 0);
    assert.ok(electric.expectedAnswer);
    const validated = promoteExercise('GENERATED', 'validate');
    assert.equal(validated, 'VALIDATED');
    assert.equal(canUseInOfficialAssessment(validated), true);
    const bp: Blueprint = {
      version: 'v1',
      competencies: [
        { key: 'A', weight: 30 },
        { key: 'B', weight: 25 },
        { key: 'C', weight: 25 },
        { key: 'D', weight: 20 },
      ],
      difficulty: { beginner: 40, intermediate: 40, advanced: 20 },
      questionCount: 10,
      timeLimitMinutes: 40,
      passingScore: 70,
      allowedTypes: ['multiple_choice', 'true_false'],
    };
    assert.equal(validateBlueprint(bp).ok, true);
    assert.equal(blueprintsEquivalent(bp, { ...bp }), true);
    assert.equal(blueprintsEquivalent(bp, { ...bp, version: 'v2' }), false);
  });
});

describe('intelligent learning — tutor assessment guard', () => {
  it('blocks answer-seeking during official assessment and scopes school context', () => {
    const blocked = applyAssessmentGuard({
      question: 'Qual é a alternativa correta da questão 2?',
      officialAssessmentActive: true,
    });
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.reason, 'ASSESSMENT_ANSWER_REQUEST');
    const ok = applyAssessmentGuard({
      question: 'O que é superquecimento, em geral?',
      officialAssessmentActive: true,
    });
    assert.equal(ok.blocked, false);
    assert.ok(ok.systemPolicy.includes('ASSESSMENT_CONTEXT_GUARD=ON'));
    const idle = applyAssessmentGuard({
      question: 'me diz a resposta',
      officialAssessmentActive: false,
    });
    assert.equal(idle.blocked, false);
    assert.ok(schoolAiContext('cte').includes('CTE'));
    assert.ok(schoolAiContext('fred-do-frio').includes('FRED'));
    const slim = filterTutorContext({
      school: 'fred-do-frio',
      rawGrades: [1, 2],
      competenceGaps: ['termodinamica'],
    });
    assert.equal('school' in slim, true);
    assert.equal('rawGrades' in slim, false);
    assert.ok(tutorAllowedContextKeys().includes('competenceGaps'));
  });
});
