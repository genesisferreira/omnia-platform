import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeProgressPercent,
  createLearningEngine,
  createMemoryPersistence,
  resolveContinueTarget,
} from '@omnia/learning-engine';

describe('computeProgressPercent (via learning-engine)', () => {
  it('returns 0 for empty list', () => {
    assert.equal(computeProgressPercent([]), 0);
  });

  it('counts state 1 and 2 as done', () => {
    assert.equal(
      computeProgressPercent([{ state: 0 }, { state: 1 }, { state: 2 }, { state: 0 }]),
      50,
    );
  });

  it('returns 100 when all complete', () => {
    assert.equal(computeProgressPercent([{ state: 1 }, { state: 2 }]), 100);
  });
});

describe('resolveContinueTarget (via learning-engine)', () => {
  it('prefers continue pointer when course is enrolled', () => {
    const target = resolveContinueTarget({
      courses: [{ moodleCourseId: 10 }, { moodleCourseId: 42 }],
      continuePointer: {
        courseId: 42,
        activityId: 7,
        updatedAt: new Date().toISOString(),
        source: 'last_seen',
      },
      progressByCourse: {
        10: { incompleteActivityId: 99 },
      },
    });
    assert.deepEqual(target, { courseId: 42, activityId: 7, source: 'last_seen' });
  });

  it('uses incomplete activity when no pointer', () => {
    const target = resolveContinueTarget({
      courses: [{ moodleCourseId: 10 }, { moodleCourseId: 42 }],
      continuePointer: null,
      progressByCourse: {
        10: { incompleteActivityId: 99 },
      },
    });
    assert.deepEqual(target, { courseId: 10, activityId: 99, source: 'progress' });
  });

  it('falls back to first course when no progress hints', () => {
    const target = resolveContinueTarget({
      courses: [{ moodleCourseId: 3 }],
      continuePointer: null,
    });
    assert.deepEqual(target, { courseId: 3, activityId: null, source: 'enrollment' });
  });

  it('returns null when there are no courses', () => {
    assert.equal(resolveContinueTarget({ courses: [], continuePointer: null }), null);
  });
});

describe('LearningEngine continue provider', () => {
  it('does not require window.localStorage', () => {
    const engine = createLearningEngine({
      omniaUserId: 'u',
      persistence: createMemoryPersistence(),
    });
    engine.openLesson(1, 2, null);
    assert.equal(engine.resolveContinue([{ moodleCourseId: 1 }])?.activityId, 2);
  });
});
