/**
 * Contextual not-found copy — natural, helpful, never exposes internal codes.
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
    return 'Não encontrei informação pública suficiente para responder isso com segurança. Posso, porém, ajudar você com nossos cursos, serviços, empresas do grupo ou soluções de refrigeração.';
  }
  if (assistant === 'engineering') {
    return 'Não encontrei evidência suficiente na base técnica para afirmar isso com segurança. Se você fornecer pressões, temperaturas e a condição operacional, posso continuar a análise.';
  }
  if (assistant === 'commercial') {
    return 'Não encontrei informação comercial autorizada suficiente para essa pergunta. Posso ajudar a estruturar a necessidade e orientar soluções do ecossistema Omnia.';
  }
  if (hasCourse || assistant === 'tutor') {
    return 'Não encontrei esse ponto no material autorizado desta aula. Se quiser, posso ajudar com os conceitos relacionados que estão disponíveis.';
  }
  return 'Não encontrei essa informação na base autorizada disponível para o seu perfil. Reformule a pergunta ou escolha outro assistente.';
}

export const NOT_FOUND_MESSAGE = resolveNotFoundMessage({ assistantKey: 'tutor', courseId: '1' });
