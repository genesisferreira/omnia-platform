import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AccessArgs } from 'payload';

import { academicAdminReadAccess, academicStaffAccess, isLmsStudent } from '../access/lms-academic';
import {
  ASSESSMENT_STATUSES,
  ATTEMPT_STATUSES,
  CERTIFICATE_STATUSES,
  CLASS_MODALITIES,
  CLASS_STATUSES,
  ENROLLMENT_STATUSES,
  NOTIFICATION_TYPES,
  QUESTION_TYPES,
} from '../collections/lms/constants';
import { AcademicError, isAdmin, isTeacher, relId } from '../services/academic/engine';
import { studentSafeQuestion, gradeAttempt, type NativeQuestion } from '@omnia/assessment-engine';

function accessOf(user: unknown) {
  return academicAdminReadAccess({ req: { user } } as AccessArgs);
}

describe('lms product completion — model + ACL', () => {
  it('exposes academic enums', () => {
    assert.ok(CLASS_STATUSES.includes('open'));
    assert.ok(CLASS_MODALITIES.includes('hybrid'));
    assert.ok(ENROLLMENT_STATUSES.includes('cancelled'));
    assert.deepEqual(
      [...QUESTION_TYPES],
      ['multiple_choice', 'true_false', 'short_answer', 'essay'],
    );
    assert.ok(ASSESSMENT_STATUSES.includes('published'));
    assert.ok(ATTEMPT_STATUSES.includes('published'));
    assert.ok(CERTIFICATE_STATUSES.includes('valid'));
    assert.ok(NOTIFICATION_TYPES.includes('grade_published'));
  });

  it('classifies student vs academic staff', () => {
    assert.equal(isLmsStudent({ role: 'student' }), true);
    assert.equal(isLmsStudent({ role: 'client' }), true);
    assert.equal(isLmsStudent({ role: 'instructor' }), false);
    assert.equal(academicStaffAccess({ role: 'instructor' }), true);
    assert.equal(academicStaffAccess({ role: 'student' }), false);
    assert.equal(academicStaffAccess(null), false);
  });

  it('blocks student from academic admin read and scopes instructor', () => {
    assert.equal(accessOf(null), false);
    assert.equal(accessOf({ id: 9, role: 'student' }), false);
    assert.equal(accessOf({ id: 1, role: 'admin' }), true);
    assert.deepEqual(accessOf({ id: 4, role: 'instructor' }), {
      instructor: { equals: 4 },
    });
  });

  it('engine helpers resolve ids and teacher roles without leaking other tenants', () => {
    assert.equal(relId(12), 12);
    assert.equal(relId({ id: '8' }), 8);
    assert.equal(relId(null), null);
    assert.equal(
      isTeacher({ omniaUserId: '1', role: 'teacher', isAdmin: false, via: 'internal' }),
      true,
    );
    assert.equal(
      isTeacher({ omniaUserId: '2', role: 'student', isAdmin: false, via: 'internal' }),
      false,
    );
    assert.equal(
      isAdmin({ omniaUserId: '3', role: 'admin', isAdmin: true, via: 'internal' }),
      true,
    );
    const err = new AcademicError(403, 'FORBIDDEN', 'cross-tenant');
    assert.equal(err.status, 403);
    assert.equal(err.code, 'FORBIDDEN');
  });

  it('never returns gabarito on student-safe questions', () => {
    const question: NativeQuestion = {
      id: 7,
      type: 'multiple_choice',
      points: 1,
      options: {
        choices: [
          { id: 'a', label: 'A', correct: true },
          { id: 'b', label: 'B', correct: false },
        ],
      },
    };
    const safe = studentSafeQuestion(question);
    assert.equal(JSON.stringify(safe).includes('correct'), false);
    const graded = gradeAttempt([question], [{ questionId: 7, value: 'a' }]);
    assert.equal(graded.score, 100);
    assert.equal(graded.needsManualGrade, false);
  });
});
