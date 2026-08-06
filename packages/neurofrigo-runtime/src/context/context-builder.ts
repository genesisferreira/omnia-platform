import type { RuntimeRequest, BuiltContext } from '../domain/types';
import type { ContextBuilderPort } from '../ports';

/**
 * ContextBuilder V2 — curso/módulo/aula/idioma/tenant/empresa/perfil/objetivos.
 * Nunca inclui dados fora do escopo autorizado do request.
 */
export class ContextBuilder implements ContextBuilderPort {
  build(request: RuntimeRequest): BuiltContext {
    const language = request.identity.language || 'pt-BR';
    const role = request.identity.role ?? null;
    const profileLabel =
      request.identity.profileLabel ||
      (role === 'student'
        ? 'Aluno'
        : role === 'teacher' || role === 'instructor'
          ? 'Instrutor'
          : role === 'anonymous'
            ? 'Visitante'
            : role);

    const permissions: string[] = ['ai.ask'];
    if (request.course.courseId) permissions.push('ai.course_scope');
    if (request.course.lessonId) permissions.push('ai.lesson_scope');
    if (request.conversationHistory?.length) permissions.push('ai.session_followup');

    return {
      courseId: request.course.courseId ? String(request.course.courseId) : null,
      courseTitle: request.course.courseTitle ?? null,
      moduleId: request.course.moduleId ? String(request.course.moduleId) : null,
      moduleTitle: request.course.moduleTitle ?? null,
      lessonId: request.course.lessonId ? String(request.course.lessonId) : null,
      lessonTitle: request.course.lessonTitle ?? null,
      lessonObjectives: request.course.lessonObjectives ?? null,
      ownerCompanyId: request.course.ownerCompanyId
        ? String(request.course.ownerCompanyId)
        : null,
      language,
      role,
      userId: request.identity.userId ? String(request.identity.userId) : null,
      tenantId: request.identity.tenantId ? String(request.identity.tenantId) : null,
      companyIds: request.identity.companyIds ?? [],
      profileLabel,
      permissions,
      conversationHistory: request.conversationHistory ?? [],
    };
  }
}
