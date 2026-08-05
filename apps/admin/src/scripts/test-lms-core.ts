import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COURSE_STATUSES,
  LESSON_ASSET_TYPES,
  LESSON_TYPES,
} from '../collections/lms/constants';
import {
  isLmsContentStaff,
  isLmsInstructor,
  isLmsPublisher,
} from '../access/lms-content';

describe('lms core foundation', () => {
  it('exposes workflow statuses', () => {
    assert.deepEqual([...COURSE_STATUSES], ['draft', 'review', 'published', 'archived']);
  });

  it('exposes lesson and asset types', () => {
    assert.ok(LESSON_TYPES.includes('video'));
    assert.ok(LESSON_TYPES.includes('pdf'));
    assert.ok(LESSON_ASSET_TYPES.includes('attachment'));
  });

  it('ACL helpers distinguish publisher / instructor / student', () => {
    assert.equal(isLmsPublisher({ role: 'admin' }), true);
    assert.equal(isLmsPublisher({ role: 'editor' }), false);
    assert.equal(isLmsInstructor({ role: 'instructor' }), true);
    assert.equal(isLmsContentStaff({ role: 'student' }), false);
    assert.equal(isLmsContentStaff({ role: 'instructor' }), true);
  });
});
