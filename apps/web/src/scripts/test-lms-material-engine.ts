import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLearningEngine, createMemoryPersistence } from '@omnia/learning-engine';

describe('Material Experience × Learning Engine', () => {
  it('emits material lifecycle + continue + progress', () => {
    const engine = createLearningEngine({
      omniaUserId: 's1',
      persistence: createMemoryPersistence(),
      correlationIdFactory: () => 'c-mat',
    });

    engine.syncProgress(3, [
      { moodleActivityId: 10, state: 0 },
      { moodleActivityId: 11, state: 0 },
    ]);
    engine.openMaterial(3, 10, 'mat:10:primary');
    engine.viewMaterial(3, 10, 'mat:10:primary');
    engine.completeMaterial(3, 10, 'mat:10:primary');
    engine.closeMaterial(3, 10, 'mat:10:primary');

    const types = engine.getEvents().map((e) => e.type);
    for (const required of [
      'progress.updated',
      'material.opened',
      'continue.updated',
      'material.viewed',
      'material.completed',
      'material.closed',
    ] as const) {
      assert.ok(types.includes(required), `missing ${required}`);
    }
    assert.equal(engine.getContinuePointer()?.activityId, 10);
    assert.ok(engine.getTimeline().some((t) => t.kind === 'material'));
  });
});
