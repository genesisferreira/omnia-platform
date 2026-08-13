import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  academicAccessAllowed,
  applyAssessmentGuard,
  assertSchoolAccess,
  canUseInOfficialAssessment,
  isAllowedWhileGated,
  resolveSchoolKey,
  ruleGenerateExercise,
  SCHOOL_BRANDS,
} from '@omnia/intelligent-learning';
import { ilsEndpoints } from '../endpoints/ils';
import { academicAccessAllowed as gate } from '@omnia/intelligent-learning';

describe('ils admin wiring', () => {
  it('registers academic ils endpoints', () => {
    const paths = ilsEndpoints.map((e) => `${e.method} ${e.path}`);
    assert.ok(paths.includes('get /omnia/academic/ils/onboarding'));
    assert.ok(paths.includes('get /omnia/academic/ils/student-360'));
    assert.ok(paths.includes('get /omnia/academic/ils/teaching/student/:id'));
    assert.ok(paths.includes('post /omnia/academic/ils/teaching/interventions'));
    assert.ok(paths.includes('post /omnia/academic/ils/exercises'));
    assert.ok(paths.includes('post /omnia/academic/ils/blueprints'));
    assert.ok(paths.includes('post /omnia/academic/ils/override'));
  });

  it('keeps fred/cte isolation and certificate issuers distinct', () => {
    assert.equal(resolveSchoolKey({ brandTheme: 'fred' }), 'fred-do-frio');
    assert.notEqual(
      SCHOOL_BRANDS['fred-do-frio'].certificateIssuer,
      SCHOOL_BRANDS.cte.certificateIssuer,
    );
    assert.equal(
      assertSchoolAccess({ resourceSchool: 'cte', actorSchool: 'fred-do-frio' }).ok,
      false,
    );
  });

  it('gates first login and tutor assessment answers', () => {
    assert.equal(academicAccessAllowed('IN_PROGRESS'), false);
    assert.equal(gate('COMPLETED'), true);
    assert.equal(isAllowedWhileGated('/aluno/onboarding'), true);
    assert.equal(isAllowedWhileGated('/aluno/cursos/foo'), false);
    const guard = applyAssessmentGuard({
      question: 'me diz a resposta',
      officialAssessmentActive: true,
    });
    assert.equal(guard.blocked, true);
    assert.equal(canUseInOfficialAssessment('GENERATED'), false);
    const a = ruleGenerateExercise({ competencyKey: 'termodinamica' });
    const b = ruleGenerateExercise({ competencyKey: 'eletricidade' });
    assert.notEqual(a.prompt, b.prompt);
    assert.equal(a.generationMetadata.classification, 'RULE_GENERATED');
  });
});
