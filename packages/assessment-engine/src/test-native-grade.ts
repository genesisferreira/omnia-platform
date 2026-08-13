import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { gradeAttempt, studentSafeQuestion, type NativeQuestion } from './native-grade';

const mcq: NativeQuestion = {
  id: 1,
  type: 'multiple_choice',
  points: 2,
  options: {
    choices: [
      { id: 'a', label: 'Errada' },
      { id: 'b', label: 'Certa', correct: true },
    ],
  },
};

const tf: NativeQuestion = {
  id: 2,
  type: 'true_false',
  points: 1,
  options: {
    choices: [
      { id: 't', label: 'V', correct: true },
      { id: 'f', label: 'F' },
    ],
  },
};

const shortQ: NativeQuestion = {
  id: 3,
  type: 'short_answer',
  points: 1,
  options: { answer: 'R404A', acceptable: ['r-404a'] },
};

const essay: NativeQuestion = { id: 4, type: 'essay', points: 5, options: null };

describe('native grade', () => {
  it('auto-grades MCQ / TF / short and flags essay', () => {
    const result = gradeAttempt(
      [mcq, tf, shortQ, essay],
      [
        { questionId: 1, value: 'b' },
        { questionId: 2, value: 't' },
        { questionId: 3, value: 'r-404a' },
        { questionId: 4, value: 'dissertação' },
      ],
    );
    assert.equal(result.needsManualGrade, true);
    assert.equal(result.maxScore, 9);
    assert.equal(result.score, 44.4);
    assert.equal(result.breakdown.find((b) => b.questionId === 1)?.correct, true);
    assert.equal(result.breakdown.find((b) => b.questionId === 3)?.correct, true);
  });

  it('strips answer keys from student-safe payload', () => {
    const safe = studentSafeQuestion(mcq);
    assert.equal('correct' in (safe.options.choices[1] || {}), false);
    assert.ok(safe.options.choices.every((c) => c.label));
  });

  it('does not leak correct flags', () => {
    const safe = studentSafeQuestion(mcq);
    assert.deepEqual(
      safe.options.choices.map((c) => Object.keys(c).sort()),
      [
        ['id', 'label'],
        ['id', 'label'],
      ],
    );
  });
});
