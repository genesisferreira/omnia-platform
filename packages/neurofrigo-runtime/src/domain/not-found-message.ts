/**
 * Contextual not-found copy — natural, helpful, never exposes internal codes.
 */
export function resolveNotFoundMessage(input: {
  assistantKey?: string | null;
  channel?: string | null;
  courseId?: string | null;
  portalArea?: string | null;
}): string {
  const assistant = (input.assistantKey || '').toLowerCase();
  const channel = (input.channel || '').toLowerCase();
  const portalArea = (input.portalArea || '').toLowerCase();
  const hasCourse = Boolean(input.courseId);
  const isOnboarding =
    channel === 'onboarding' ||
    channel === 'assessment' ||
    portalArea === 'onboarding' ||
    portalArea === 'student_onboarding';

  if (isOnboarding) {
    return 'Podemos continuar a conversa de boas-vindas e avaliação mesmo sem material de aula. Me diga um pouco mais sobre sua experiência ou objetivo e seguimos.';
  }
  if (channel === 'portal_public' || assistant === 'concierge') {
    return 'Não encontrei informação pública suficiente para responder isso com segurança. Posso, porém, ajudar você com nossos cursos, serviços, empresas do grupo ou soluções de refrigeração.';
  }
  if (assistant === 'engineering') {
    return 'Não encontrei evidência suficiente na base técnica para afirmar isso com segurança. Se você fornecer pressões, temperaturas e a condição operacional, posso continuar a análise.';
  }
  if (assistant === 'commercial') {
    return 'Não encontrei informação comercial autorizada suficiente para essa pergunta. Posso ajudar a estruturar a necessidade e orientar soluções do ecossistema Omnia.';
  }
  if (hasCourse || (assistant === 'tutor' && channel !== 'academic_general')) {
    return 'Não encontrei esse ponto no material autorizado desta aula. Se quiser, posso ajudar com os conceitos relacionados que estão disponíveis.';
  }
  return 'Não encontrei essa informação na base autorizada disponível para o seu perfil. Reformule a pergunta e eu tento de outro ângulo.';
}

export const NOT_FOUND_MESSAGE = resolveNotFoundMessage({ assistantKey: 'tutor', courseId: '1' });
