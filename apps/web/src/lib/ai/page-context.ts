import type { AskAiContext } from '@/components/ai/types';

/**
 * Derive page AI context from the current portal route.
 * Security-sensitive IDs still validated server-side on chat.
 */
export function resolvePageAiContext(pathname: string): AskAiContext {
  const path = pathname || '/';
  const ctx: AskAiContext = {
    currentRoute: path,
    portalArea: 'portal',
    language: 'pt-BR',
  };

  if (path === '/ia' || path.startsWith('/ia/')) {
    ctx.portalArea = 'ai_command_center';
    return ctx;
  }

  if (path === '/lms' || path.startsWith('/lms/')) {
    ctx.portalArea = 'lms';
    const courseMatch = path.match(/^\/lms\/cursos\/([^/]+)/);
    if (courseMatch?.[1]) {
      ctx.courseId = decodeURIComponent(courseMatch[1]);
      const lessonMatch = path.match(/\/atividades\/([^/]+)/);
      if (lessonMatch?.[1]) ctx.lessonId = decodeURIComponent(lessonMatch[1]);
    }
    return ctx;
  }

  if (path === '/aluno/onboarding' || path.startsWith('/aluno/onboarding/')) {
    ctx.portalArea = 'onboarding';
    return ctx;
  }

  if (path === '/aluno' || path.startsWith('/aluno/')) {
    ctx.portalArea = 'student';
    const courseMatch = path.match(/^\/aluno\/cursos\/([^/]+)(?:\/aula\/([^/]+))?/);
    if (courseMatch?.[1]) {
      ctx.courseTitle = decodeURIComponent(courseMatch[1]);
      if (courseMatch[2]) ctx.lessonTitle = decodeURIComponent(courseMatch[2]);
    }
    return ctx;
  }

  if (path === '/professor' || path.startsWith('/professor/')) {
    ctx.portalArea = 'teacher';
    return ctx;
  }

  const publicCourse = path.match(/^\/cursos\/([^/]+)(?:\/aula\/([^/]+))?/);
  if (publicCourse?.[1]) {
    ctx.portalArea = 'courses';
    ctx.courseTitle = decodeURIComponent(publicCourse[1]);
    if (publicCourse[2]) ctx.lessonTitle = decodeURIComponent(publicCourse[2]);
    return ctx;
  }

  if (path.startsWith('/empresas')) {
    ctx.portalArea = 'companies';
    return ctx;
  }

  return ctx;
}

export function contextLabel(ctx: AskAiContext): string {
  if (ctx.lessonTitle) return `Aula · ${ctx.lessonTitle}`;
  if (ctx.courseTitle) return `Curso · ${ctx.courseTitle}`;
  if (ctx.courseId) return `Curso #${ctx.courseId}`;
  if (ctx.portalArea === 'ai_command_center') return 'Central de Inteligência';
  if (ctx.portalArea === 'onboarding') return 'Boas-vindas';
  if (ctx.portalArea === 'student') return 'Área do aluno';
  if (ctx.portalArea === 'teacher') return 'Área do professor';
  if (ctx.portalArea === 'lms') return 'LMS legado';
  if (ctx.portalArea === 'companies') return 'Empresas';
  return 'Portal Omnia';
}

export function isAcademicNativePath(pathname: string): boolean {
  const path = pathname || '';
  return (
    path === '/aluno' ||
    path.startsWith('/aluno/') ||
    path === '/professor' ||
    path.startsWith('/professor/')
  );
}
