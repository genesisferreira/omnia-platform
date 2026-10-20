import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAssessmentEngine, buildAssessmentDescriptor } from '@omnia/assessment-engine';
import { createLearningEngine, createMemoryPersistence } from '@omnia/learning-engine';

describe('Assessment × Learning Engine', () => {
  it('bridges assessment events into learning timeline', () => {
    const learning = createLearningEngine({
      omniaUserId: 's1',
      persistence: createMemoryPersistence(),
      correlationIdFactory: () => 'c-assess',
    });
    learning.syncProgress(4, [{ moodleActivityId: 8, state: 0 }]);

    const assess = createAssessmentEngine({
      omniaUserId: 's1',
      sink: {
        emitAssessmentEvent: (type, payload) => learning.emitAssessmentEvent(type, payload),
        updateContinue: (p) =>
          learning.updateContinue({
            courseId: p.courseId,
            activityId: p.activityId,
            sectionId: p.sectionId,
            source: p.source,
          }),
      },
    });

    const d = buildAssessmentDescriptor({
      courseId: 4,
      activityId: 8,
      name: 'Quiz final',
      modName: 'quiz',
      visible: true,
      grade: { itemName: 'Quiz final', gradeFormatted: '9.0', percentage: 90 },
    });
    const r = assess.open(d);
    assess.viewGrade(r);
    assess.complete(r);
    assess.close(r);

    const types = learning.getEvents().map((e) => e.type);
    for (const required of [
      'progress.updated',
      'assessment.opened',
      'assessment.viewed',
      'quiz.viewed',
      'continue.updated',
      'grade.viewed',
      'assessment.completed',
      'assessment.closed',
    ] as const) {
      assert.ok(types.includes(required), `missing ${required}`);
    }
    assert.equal(learning.getContinuePointer()?.activityId, 8);
    assert.ok(learning.getTimeline().length >= 3);
  });
});
