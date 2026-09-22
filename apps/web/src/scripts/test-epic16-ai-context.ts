import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contextLabel, resolvePageAiContext } from '../lib/ai/page-context';
import { buildUserAiContext, mapPortalRoleToAiRole } from '../lib/ai/user-ai-context';

describe('EPIC 16 page context resolution', () => {
  it('maps /ia to command center area', () => {
    const ctx = resolvePageAiContext('/ia');
    assert.equal(ctx.portalArea, 'ai_command_center');
    assert.equal(contextLabel(ctx), 'Central de Inteligência');
  });

  it('maps public course and lesson routes', () => {
    const course = resolvePageAiContext('/cursos/fundamentos');
    assert.equal(course.portalArea, 'courses');
    assert.equal(course.courseTitle, 'fundamentos');
    const lesson = resolvePageAiContext('/cursos/fundamentos/aula/valvula');
    assert.equal(lesson.lessonTitle, 'valvula');
  });

  it('maps LMS course routes without trusting browser elevation', () => {
    const ctx = resolvePageAiContext('/lms/cursos/12/atividades/99');
    assert.equal(ctx.portalArea, 'lms');
    assert.equal(ctx.courseId, '12');
    assert.equal(ctx.lessonId, '99');
  });
});

describe('EPIC 16 identity mapping', () => {
  it('maps portal roles to AI capability roles', () => {
    assert.equal(mapPortalRoleToAiRole('student'), 'student');
    assert.equal(mapPortalRoleToAiRole('instructor'), 'teacher');
    assert.equal(mapPortalRoleToAiRole('client'), 'client');
    assert.equal(mapPortalRoleToAiRole('admin'), 'admin');
  });

  it('builds user AI context from session user without client spoof fields', () => {
    const ctx = buildUserAiContext(
      {
        id: '19',
        email: 'a@example.invalid',
        firstName: 'Ana',
        lastName: 'Silva',
        role: 'student',
      },
      { currentRoute: '/ia', currentPortalArea: 'ai_command_center' },
    );
    assert.equal(ctx.userId, '19');
    assert.equal(ctx.role, 'student');
    assert.equal(ctx.displayName, 'Ana Silva');
    assert.equal(ctx.currentPortalArea, 'ai_command_center');
  });
});
