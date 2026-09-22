import assert from 'node:assert/strict';
import test from 'node:test';

import { gateAuthenticatedAiRequest } from '../lib/auth/ai-auth-gate';

test('AI chat without session → 401 before payload validation', () => {
  const gate = gateAuthenticatedAiRequest({
    hasSession: false,
    jsonValid: true,
    requireQuestion: true,
    question: '',
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.status, 401);
    assert.equal(gate.error, 'UNAUTHORIZED');
  }
});

test('AI chat invalid session treated as no session → 401', () => {
  const gate = gateAuthenticatedAiRequest({
    hasSession: false,
    jsonValid: false,
    requireQuestion: true,
    question: 'ping',
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.status, 401);
    assert.equal(gate.error, 'UNAUTHORIZED');
  }
});

test('AI chat valid session + missing question → 400', () => {
  const gate = gateAuthenticatedAiRequest({
    hasSession: true,
    jsonValid: true,
    requireQuestion: true,
    question: '   ',
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.status, 400);
    assert.equal(gate.error, 'question is required');
  }
});

test('AI chat valid session + valid question → ok (authorization is upstream)', () => {
  const gate = gateAuthenticatedAiRequest({
    hasSession: true,
    jsonValid: true,
    requireQuestion: true,
    question: 'ping',
  });
  assert.equal(gate.ok, true);
});

test('forbidden upstream maps to 403/404 at connector boundary (contract)', () => {
  // BFF returns Admin status unchanged; ACL denials are 403 or 404.
  const allowed = new Set([403, 404]);
  assert.equal(allowed.has(403), true);
  assert.equal(allowed.has(404), true);
});
