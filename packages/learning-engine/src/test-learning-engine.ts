import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LearningCache } from './cache/learning-cache';
import { resolveContinueTarget } from './continue/resolve-continue';
import { createLearningEvent, LEARNING_EVENT_TYPES } from './events/create-event';
import { createLearningEngine } from './engine';
import { createMemoryPersistence } from './persistence';
import { computeProgressPercent, findIncompleteActivityId } from './sync/progress';
import { eventToTimelineItem, groupTimelineByDay } from './timeline/build-timeline';

describe('computeProgressPercent', () => {
  it('handles empty and mixed states', () => {
    assert.equal(computeProgressPercent([]), 0);
    assert.equal(computeProgressPercent([{ state: 0 }, { state: 1 }, { state: 2 }]), 67);
  });
});

describe('resolveContinueTarget', () => {
  it('prefers continue pointer when enrolled', () => {
    const target = resolveContinueTarget({
      courses: [{ moodleCourseId: 10 }, { moodleCourseId: 42 }],
      continuePointer: {
        courseId: 42,
        activityId: 7,
        updatedAt: new Date().toISOString(),
        source: 'last_seen',
      },
    });
    assert.deepEqual(target, { courseId: 42, activityId: 7, source: 'last_seen' });
  });

  it('falls back to progress then enrollment', () => {
    const byProgress = resolveContinueTarget({
      courses: [{ moodleCourseId: 10 }],
      continuePointer: null,
      progressByCourse: { 10: { incompleteActivityId: 3 } },
    });
    assert.equal(byProgress?.source, 'progress');
    assert.equal(byProgress?.activityId, 3);

    const byEnrol = resolveContinueTarget({
      courses: [{ moodleCourseId: 9 }],
      continuePointer: null,
    });
    assert.deepEqual(byEnrol, { courseId: 9, activityId: null, source: 'enrollment' });
  });
});

describe('LearningCache', () => {
  it('expires entries by ttl', () => {
    let now = 1_000;
    const cache = new LearningCache({ defaultTtlMs: 100, now: () => now });
    cache.set('a', 1);
    assert.equal(cache.get('a'), 1);
    now = 1_200;
    assert.equal(cache.get('a'), undefined);
  });
});

describe('Learning events + timeline', () => {
  it('builds catalog-compliant envelopes', () => {
    const event = createLearningEvent({
      type: 'lesson.opened',
      actor: { type: 'user', id: 'u1', role: 'student' },
      origin: 'omnia.learning-engine',
      correlationId: 'c1',
      payload: { courseId: 2, activityId: 5 },
    });
    assert.equal(event.type, 'lesson.opened');
    assert.ok(event.eventId);
    assert.ok(event.timestamp);
    assert.equal(event.schemaVersion, 1);
    assert.ok(LEARNING_EVENT_TYPES.includes('continue.updated'));
  });

  it('maps events to timeline and groups by day', () => {
    const event = createLearningEvent({
      type: 'material.opened',
      actor: { type: 'user', id: 'u1' },
      origin: 'omnia.web',
      correlationId: 'c2',
      payload: { courseId: 1, activityId: 2 },
      timestamp: new Date().toISOString(),
    });
    const item = eventToTimelineItem(event);
    assert.equal(item.kind, 'material');
    const groups = groupTimelineByDay([item]);
    assert.ok(groups.length >= 1);
    assert.ok(groups.some((g) => g.label === 'Hoje' || g.items.length > 0));
  });
});

describe('LearningEngine integration', () => {
  it('emits required epic events and persists continue via injected store', () => {
    const persistence = createMemoryPersistence();
    const engine = createLearningEngine({
      omniaUserId: 'user-1',
      actorRole: 'student',
      persistence,
      correlationIdFactory: () => 'corr-test',
    });

    engine.openCourse(2);
    engine.openModule(2, 1);
    engine.openLesson(2, 9, 1);
    engine.openMaterial(2, 9, 'm1');
    engine.viewMaterial(2, 9, 'm1');
    engine.completeMaterial(2, 9, 'm1');
    engine.closeMaterial(2, 9, 'm1');
    engine.completeLesson(2, 9, 1);
    engine.completeModule(2, 1);
    engine.closeLesson(2, 9);

    const types = engine.getEvents().map((e) => e.type);
    for (const required of [
      'course.opened',
      'module.opened',
      'lesson.opened',
      'activity.started',
      'continue.updated',
      'material.opened',
      'material.viewed',
      'material.completed',
      'material.closed',
      'lesson.completed',
      'activity.completed',
      'module.completed',
      'lesson.closed',
    ] as const) {
      assert.ok(types.includes(required), `missing ${required}`);
    }

    assert.equal(engine.getContinuePointer()?.courseId, 2);
    assert.equal(engine.getContinuePointer()?.activityId, 9);

    const snap = engine.syncProgress(2, [
      { moodleActivityId: 9, state: 1 },
      { moodleActivityId: 10, state: 0 },
    ]);
    assert.equal(snap.percent, 50);
    assert.equal(findIncompleteActivityId(snap.activities), 10);
    assert.ok(engine.getEvents().some((e) => e.type === 'progress.updated'));

    engine.syncCompletion(2, { completed: true, timeCompleted: '2026-07-31T12:00:00.000Z' });
    assert.ok(engine.getEvents().some((e) => e.type === 'course.completed'));

    const target = engine.resolveContinue([{ moodleCourseId: 2 }]);
    assert.equal(target?.courseId, 2);
    assert.ok(engine.getEvents().some((e) => e.type === 'continue.resolved'));

    const timeline = engine.getTimeline();
    assert.ok(timeline.length >= 5);
    assert.ok(engine.getTimelineGrouped().length >= 1);

    // rehydrate from persistence — no direct localStorage
    const again = createLearningEngine({
      omniaUserId: 'user-1',
      persistence,
    });
    assert.equal(again.getContinuePointer()?.activityId, 9);
  });
});
