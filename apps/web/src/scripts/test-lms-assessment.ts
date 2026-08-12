import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAssessmentDescriptor,
  detectAssessmentType,
  isAssessmentMod,
  resolveAssessment,
} from '@omnia/assessment-engine';

describe('assessment resolve (web)', () => {
  it('detects assessment mods', () => {
    assert.equal(isAssessmentMod('quiz'), true);
    assert.equal(detectAssessmentType('assign'), 'assignment');
  });

  it('builds assignment descriptor read-only', () => {
    const d = buildAssessmentDescriptor({
      courseId: 2,
      activityId: 5,
      name: 'Entrega',
      modName: 'assign',
      visible: true,
      progressState: 0,
    });
    const r = resolveAssessment(d);
    assert.equal(r.type, 'assignment');
    assert.equal(r.permissions.canSubmit, false);
    assert.equal(r.uiStatus, 'available');
  });
});
