import type { SuggestedAction } from '../domain/types';

export type { SuggestedAction };

function uniq(actions: SuggestedAction[]): SuggestedAction[] {
  const seen = new Set<string>();
  const out: SuggestedAction[] = [];
  for (const a of actions) {
    const key = a.question.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: a.label.trim(), question: a.question.trim() });
    if (out.length >= 4) break;
  }
  return out;
}

/**
 * Contextual next-best-actions — never forced / never generic chips every turn.
 */
export function buildSuggestedActions(input: {
  assistantKey?: string | null;
  channel?: string | null;
  question: string;
  status: string;
  intent?: string | null;
  hasSources: boolean;
  conversationKind?: string | null;
}): SuggestedAction[] {
  const key = (input.assistantKey || '').toLowerCase();
  const kind = (input.conversationKind || input.intent || '').toLowerCase();
  const isPublic = input.channel === 'portal_public' || key === 'concierge';

  if (input.status === 'not_found') {
    if (isPublic) {
      return uniq([
        { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
        { label: 'Ver serviços', question: 'Quais serviços vocês oferecem?' },
        { label: 'Empresas do grupo', question: 'Quais empresas fazem parte da Omnia Frigo?' },
      ]);
    }
    return [];
  }

  if (kind === 'course_catalog' || kind === 'course_recommendation') {
    return uniq([
      { label: 'Encontrar o curso ideal', question: 'Indique o curso mais adequado para mim' },
      { label: 'Ver detalhes', question: 'Quero detalhes desse curso' },
    ]);
  }

  if (kind === 'services') {
    return uniq([
      { label: 'Falar sobre meu projeto', question: 'Quero falar sobre meu projeto técnico' },
      {
        label: 'Qual empresa me atende?',
        question: 'Qual empresa me atende para serviços técnicos?',
      },
    ]);
  }

  if (
    kind === 'institutional_overview' ||
    kind === 'clarification' ||
    kind === 'affirmation_orphan'
  ) {
    return uniq([
      { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
      { label: 'Ver serviços', question: 'Quais serviços vocês oferecem?' },
      { label: 'Indicar empresa', question: 'Qual empresa cuida de engenharia e projetos?' },
    ]);
  }

  if (kind === 'company_routing') {
    return uniq([
      { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
      { label: 'Ver serviços', question: 'Quais serviços técnicos a Renovação oferece?' },
    ]);
  }

  if (
    kind.startsWith('teaching') ||
    key === 'tutor' ||
    kind === 'teaching_rephrase' ||
    kind === 'teaching_example' ||
    kind === 'teaching_check'
  ) {
    return uniq([
      {
        label: 'Explique mais simples',
        question: 'Não entendi, explique de outro jeito mais simples.',
      },
      { label: 'Ver exemplo', question: 'Me dê um exemplo.' },
      { label: 'Testar meu conhecimento', question: 'Faça uma pergunta para ver se eu entendi.' },
    ]);
  }

  if (kind === 'commercial_discovery' || key === 'commercial') {
    return uniq([
      { label: 'Quantas lojas', question: 'Temos 3 lojas no escopo.' },
      { label: 'Comparar soluções', question: 'Pode comparar as soluções aplicáveis?' },
    ]);
  }

  if (kind === 'engineering_troubleshooting' || key === 'engineering') {
    return uniq([
      {
        label: 'Enviar pressões',
        question: 'Sucção 32 psi e condensação 220 psi.',
      },
      {
        label: 'Continuar diagnóstico',
        question: 'Quais dados você ainda precisa para continuar?',
      },
    ]);
  }

  if (isPublic) {
    return uniq([
      { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
      { label: 'Ver serviços', question: 'Quais serviços vocês oferecem?' },
    ]);
  }

  return [];
}
