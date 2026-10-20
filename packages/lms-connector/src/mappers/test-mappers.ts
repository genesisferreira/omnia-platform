import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapMoodleCompletion,
  mapMoodleCourseContents,
  mapMoodleCourses,
  mapMoodleGrades,
  mapMoodleProgress,
  mapMoodleUser,
} from './index';

describe('LMS mappers', () => {
  it('mapeia usuário', () => {
    const u = mapMoodleUser({
      id: 10,
      username: 'aluno',
      fullname: 'Aluno Teste',
      email: 'a@t.com',
      firstname: 'Aluno',
      lastname: 'Teste',
    });
    assert.equal(u?.moodleUserId, 10);
    assert.equal(u?.username, 'aluno');
  });

  it('usuário sem id → null', () => {
    assert.equal(mapMoodleUser({ username: 'x' }), null);
  });

  it('mapeia cursos e campos ausentes', () => {
    const courses = mapMoodleCourses([{ id: 1, shortname: 'C1', fullname: 'Curso 1' }]);
    assert.equal(courses.length, 1);
    assert.equal(courses[0]?.summary, null);
    assert.equal(courses[0]?.visible, true);
  });

  it('mapeia conteúdo do curso', () => {
    const sections = mapMoodleCourseContents([
      {
        id: 5,
        name: 'Semana 1',
        modules: [{ id: 99, name: 'PDF', modname: 'resource', completion: 1 }],
      },
    ]);
    assert.equal(sections[0]?.activities[0]?.moodleActivityId, 99);
    assert.equal(sections[0]?.activities[0]?.completionEnabled, true);
  });

  it('mapeia progresso', () => {
    const p = mapMoodleProgress(
      { statuses: [{ cmid: 99, state: 1, timecompleted: 1700000000 }] },
      1,
      10,
    );
    assert.equal(p.activities[0]?.moodleActivityId, 99);
    assert.ok(p.activities[0]?.timeCompleted);
  });

  it('mapeia completion', () => {
    const c = mapMoodleCompletion(
      { completionstatus: { completed: true, timecompleted: 1700000000, aggregation: 1 } },
      1,
      10,
    );
    assert.equal(c.completed, true);
  });

  it('mapeia notas e tipos inesperados', () => {
    const grades = mapMoodleGrades({
      usergrades: [
        {
          courseid: 1,
          userid: 10,
          gradeitems: [
            {
              itemname: 'Quiz',
              cmid: 3,
              gradeformatted: '8.00',
              graderaw: 8,
              grademax: 10,
              percentageformatted: '80 %',
            },
            { itemname: null },
          ],
        },
      ],
    });
    assert.equal(grades.length, 1);
    assert.equal(grades[0]?.percentage, 80);
  });
});
