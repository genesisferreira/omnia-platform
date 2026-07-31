import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeProgressPercent, resolveContinueTarget } from '../lib/lms/continue';

describe('computeProgressPercent', () => {
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

describe('resolveContinueTarget', () => {
  it('prefers last-seen when course is enrolled', () => {
    const target = resolveContinueTarget({
      omniaUserId: 'u1',
      courses: [{ moodleCourseId: 10 }, { moodleCourseId: 42 }],
      lastSeen: {
        courseId: 42,
        activityId: 7,
        updatedAt: new Date().toISOString(),
      },
      progressByCourse: {
        10: { incompleteActivityId: 99 },
      },
    });
    assert.deepEqual(target, { courseId: 42, activityId: 7 });
  });

  it('uses incomplete activity when no last-seen', () => {
    const target = resolveContinueTarget({
      omniaUserId: 'u1',
      courses: [{ moodleCourseId: 10 }, { moodleCourseId: 42 }],
      lastSeen: null,
      progressByCourse: {
        10: { incompleteActivityId: 99 },
      },
    });
    assert.deepEqual(target, { courseId: 10, activityId: 99 });
  });

  it('falls back to first course when no progress hints', () => {
    const target = resolveContinueTarget({
      omniaUserId: 'user-empty',
      courses: [{ moodleCourseId: 3 }],
      lastSeen: null,
    });
    assert.deepEqual(target, { courseId: 3, activityId: null });
  });

  it('returns null when there are no courses', () => {
    assert.equal(
      resolveContinueTarget({ omniaUserId: 'u', courses: [], lastSeen: null }),
      null,
    );
  });
});
