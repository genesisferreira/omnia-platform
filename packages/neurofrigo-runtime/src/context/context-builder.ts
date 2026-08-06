import type { RuntimeRequest, BuiltContext } from '../domain/types';
import type { ContextBuilderPort } from '../ports';

/**
 * Monta contexto autorizado para o Runtime.
 * Nunca inclui dados fora do escopo do request.
 */
export class ContextBuilder implements ContextBuilderPort {
  build(request: RuntimeRequest): BuiltContext {
    const language = request.identity.language || 'pt-BR';
    const permissions: string[] = ['ai.ask'];
    if (request.course.courseId) permissions.push('ai.course_scope');
    if (request.course.lessonId) permissions.push('ai.lesson_scope');

    return {
      courseId: request.course.courseId ? String(request.course.courseId) : null,
      courseTitle: request.course.courseTitle ?? null,
      moduleId: request.course.moduleId ? String(request.course.moduleId) : null,
      moduleTitle: request.course.moduleTitle ?? null,
      lessonId: request.course.lessonId ? String(request.course.lessonId) : null,
      lessonTitle: request.course.lessonTitle ?? null,
      ownerCompanyId: request.course.ownerCompanyId
        ? String(request.course.ownerCompanyId)
        : null,
      language,
      role: request.identity.role ?? null,
      userId: request.identity.userId ? String(request.identity.userId) : null,
      tenantId: request.identity.tenantId ? String(request.identity.tenantId) : null,
      companyIds: request.identity.companyIds ?? [],
      permissions,
    };
  }
}
