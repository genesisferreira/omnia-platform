/**
 * Testes de contrato BFF LMS (helpers) — sem Moodle real.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { notLinkedBody } from '../services/lms/identity';
import { parseCourseId, parsePositiveIntParam } from '../services/lms/read-api';

describe('LMS BFF helpers', () => {
  it('not linked body é estruturado', () => {
    assert.deepEqual(notLinkedBody(), {
      connected: false,
      reason: 'MOODLE_IDENTITY_NOT_LINKED',
    });
  });

  it('valida courseId', () => {
    assert.equal(parseCourseId('12'), 12);
    assert.equal(parseCourseId('0'), null);
    assert.equal(parseCourseId('abc'), null);
    assert.equal(parseCourseId(undefined), null);
  });

  it('limita paginação', () => {
    assert.equal(parsePositiveIntParam('999', 20, 50), 50);
    assert.equal(parsePositiveIntParam(undefined, 20, 50), 20);
    assert.equal(parsePositiveIntParam('-1', 20, 50), 20);
  });
});
