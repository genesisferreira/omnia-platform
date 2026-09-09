import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composeLmsNextStepAnswer, isLmsNextStepQuestion } from './lms-next-step';

describe('LMS next-step intent (RC2.4)', () => {
  it('detects next-step questions', () => {
    assert.equal(isLmsNextStepQuestion('qual o proximo passo'), true);
    assert.equal(isLmsNextStepQuestion('Qual é meu próximo passo no curso?'), true);
    assert.equal(isLmsNextStepQuestion('o que estudo agora?'), true);
    assert.equal(isLmsNextStepQuestion('qual aula faço depois?'), true);
    assert.equal(isLmsNextStepQuestion('O que faz o condensador?'), false);
    assert.equal(isLmsNextStepQuestion('Qual a formula secreta do refrigerante XYZ-999?'), false);
  });

  it('composes student-specific LMS answer', () => {
    const text = composeLmsNextStepAnswer({
      courseTitle: 'Fundamentos HVAC',
      progressPercent: 35,
      currentLessonTitle: 'Condensador',
      recommendations: [
        {
          type: 'next_lesson',
          title: 'Evaporador e fluxo de ar',
          reason: 'Próxima aula autorizada na sequência do curso.',
          courseId: '12',
          lessonId: '22',
          moduleId: '3',
        },
      ],
    });
    assert.match(text, /Evaporador e fluxo de ar/);
    assert.match(text, /Condensador/);
    assert.doesNotMatch(text, /n[aã]o encontrei esse ponto no material/);
  });
});
