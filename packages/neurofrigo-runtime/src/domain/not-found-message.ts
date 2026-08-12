/**
 * Contextual not-found copy — never use course wording outside academic scope.
 */
export function resolveNotFoundMessage(input: {
  assistantKey?: string | null;
  channel?: string | null;
  courseId?: string | null;
}): string {
  const assistant = (input.assistantKey || '').toLowerCase();
  const channel = (input.channel || '').toLowerCase();
  const hasCourse = Boolean(input.courseId);

  if (channel === 'portal_public' || assistant === 'concierge') {
    return 'Não encontrei essa informação na base pública autorizada da Omnia Frigo. Posso ajudar com cursos, serviços, refrigeração e o ecossistema Omnia.';
  }
  if (assistant === 'engineering') {
    return 'Não encontrei essa informação na base técnica autorizada. Reformule com mais contexto do sistema ou do sintoma.';
  }
  if (assistant === 'commercial') {
    return 'Não encontrei essa informação na base comercial autorizada. Posso orientar sobre soluções e próximos passos de contato.';
  }
  if (hasCourse || assistant === 'tutor') {
    return 'Não encontrei essa informação no material autorizado deste curso. Posso responder apenas com base no material publicado.';
  }
  return 'Não encontrei essa informação na base autorizada disponível para o seu perfil. Reformule a pergunta ou escolha outro assistente.';
}

export const NOT_FOUND_MESSAGE = resolveNotFoundMessage({ assistantKey: 'tutor', courseId: '1' });
