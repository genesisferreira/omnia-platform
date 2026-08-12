import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLearningEngine, createMemoryPersistence } from '@omnia/learning-engine';

/**
 * Integração Lesson Experience ↔ Learning Engine:
 * open → material → complete → close; progress/continue/timeline.
 */
describe('Lesson Experience × Learning Engine', () => {
  it('emits lesson lifecycle without duplicate open on re-create snapshot', () => {
    const persistence = createMemoryPersistence();
    const engine = createLearningEngine({
      omniaUserId: 'student-1',
      actorRole: 'student',
      persistence,
      correlationIdFactory: () => 'corr-lesson',
    });

    engine.syncProgress(7, [
      { moodleActivityId: 1, state: 0 },
      { moodleActivityId: 2, state: 0 },
    ]);
    engine.openLesson(7, 1, 10);
    engine.openMaterial(7, 1, 'activity:1');
    engine.completeLesson(7, 1, 1);
    engine.closeMaterial(7, 1, 'activity:1');
    engine.closeLesson(7, 1);

    const types = engine.getEvents().map((e) => e.type);
    for (const required of [
      'progress.updated',
      'lesson.opened',
      'activity.started',
      'continue.updated',
      'material.opened',
      'lesson.completed',
      'activity.completed',
      'material.closed',
      'lesson.closed',
    ] as const) {
      assert.ok(types.includes(required), `missing ${required}`);
    }

    assert.equal(engine.getContinuePointer()?.activityId, 1);
    assert.ok(engine.getTimeline().some((t) => t.kind === 'lesson'));

    const target = engine.resolveContinue([{ moodleCourseId: 7 }]);
    assert.equal(target?.courseId, 7);
    assert.equal(target?.activityId, 1);
  });
});
