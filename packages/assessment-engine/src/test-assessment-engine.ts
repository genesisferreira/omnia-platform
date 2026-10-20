import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AssessmentCache,
  buildAssessmentDescriptor,
  createAssessmentEngine,
  createStubAssessmentSecurityPorts,
  detectAssessmentType,
  isAssessmentMod,
  resolveAssessment,
  resolveUiStatus,
} from './index';

describe('detectAssessmentType', () => {
  it('maps quiz and assign', () => {
    assert.equal(detectAssessmentType('quiz'), 'quiz');
    assert.equal(detectAssessmentType('assign'), 'assignment');
    assert.equal(isAssessmentMod('page'), false);
  });
});

describe('resolveAssessment status', () => {
  it('resolves grade published and completed', () => {
    const d = buildAssessmentDescriptor({
      courseId: 1,
      activityId: 9,
      name: 'Quiz 1',
      modName: 'quiz',
      visible: true,
      progressState: 1,
      grade: { itemName: 'Quiz 1', gradeFormatted: '8.0', percentage: 80 },
    });
    const r = resolveAssessment(d);
    assert.equal(r.uiStatus, 'feedback_available');
    assert.equal(r.rendererKey, 'quiz');
    assert.equal(r.permissions.canSubmit, false);
  });

  it('marks unavailable when not visible', () => {
    const d = buildAssessmentDescriptor({
      courseId: 1,
      activityId: 2,
      name: 'Hidden',
      modName: 'assign',
      visible: false,
    });
    assert.equal(resolveUiStatus(d), 'unavailable');
  });
});

describe('AssessmentCache', () => {
  it('expires by ttl', () => {
    let now = 1000;
    const cache = new AssessmentCache({ defaultTtlMs: 50, now: () => now });
    cache.set('a', 1);
    assert.equal(cache.get('a'), 1);
    now = 1100;
    assert.equal(cache.get('a'), undefined);
  });
});

describe('AssessmentEngine + security stubs', () => {
  it('emits assessment lifecycle via sink', () => {
    const types: string[] = [];
    const engine = createAssessmentEngine({
      omniaUserId: 'u1',
      sink: {
        emitAssessmentEvent: (t) => types.push(t),
        updateContinue: () => types.push('continue.updated'),
      },
    });
    const d = buildAssessmentDescriptor({
      courseId: 3,
      activityId: 10,
      name: 'Q',
      modName: 'quiz',
      visible: true,
      grade: { itemName: 'Q', gradeFormatted: '10', percentage: 100 },
    });
    const r = engine.open(d);
    engine.viewGrade(r);
    engine.viewFeedback(r);
    engine.complete(r);
    engine.close(r);
    for (const required of [
      'assessment.opened',
      'assessment.viewed',
      'quiz.viewed',
      'continue.updated',
      'grade.viewed',
      'feedback.viewed',
      'assessment.completed',
      'assessment.closed',
    ]) {
      assert.ok(types.includes(required), `missing ${required}`);
    }
  });

  it('security ports are NOT_IMPLEMENTED', async () => {
    const ports = createStubAssessmentSecurityPorts();
    const auth = await ports.authorization.authorize({
      omniaUserId: 'u',
      courseId: 1,
      activityId: 1,
      purpose: 'submit',
    });
    assert.equal(auth.ok, false);
  });
});
