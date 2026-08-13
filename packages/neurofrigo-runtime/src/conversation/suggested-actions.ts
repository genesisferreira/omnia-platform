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
 * Contextual next-best-actions — never forced on every turn.
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
  const q = input.question.toLowerCase();
  const isPublic = input.channel === 'portal_public' || key === 'concierge';

  if (input.status === 'not_found') {
    if (isPublic) {
      return uniq([
        { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
        { label: 'Ver serviços', question: 'Quais serviços vocês oferecem?' },
        { label: 'Empresas do grupo', question: 'Quais empresas fazem parte da Omnia Frigo?' },
      ]);
    }
    if (key === 'tutor') {
      return uniq([
        {
          label: 'Explicar conceitos relacionados',
          question: 'Quais conceitos relacionados estão no material?',
        },
        { label: 'Resumir a aula', question: 'Resuma o que é mais importante nesta aula.' },
      ]);
    }
    return [];
  }

  if (!input.hasSources && input.status === 'ok') {
    // Capability / meta answers
    if (isPublic) {
      return uniq([
        { label: 'Conhecer cursos', question: 'Quais cursos vocês oferecem?' },
        { label: 'Conhecer serviços', question: 'Quais serviços vocês oferecem?' },
        { label: 'Indicar empresa', question: 'Qual empresa procurar para engenharia?' },
      ]);
    }
    if (key === 'tutor') {
      return uniq([
        { label: 'Explicar um conceito', question: 'Explique o conceito principal desta aula.' },
        { label: 'Fazer um exercício', question: 'Faça uma pergunta para ver se eu entendi.' },
      ]);
    }
    if (key === 'engineering') {
      return uniq([
        { label: 'Iniciar diagnóstico', question: 'Como estruturar um diagnóstico técnico?' },
        {
          label: 'Comparar alternativas',
          question: 'Quais critérios usar para comparar soluções?',
        },
      ]);
    }
    if (key === 'commercial') {
      return uniq([
        {
          label: 'Estruturar necessidade',
          question: 'Como estruturar minha necessidade comercial?',
        },
        { label: 'Ver soluções', question: 'Quais soluções a Omnia possui para refrigeração?' },
      ]);
    }
    return [];
  }

  if (isPublic) {
    if (/curso|forma[cç][aã]o|treinamento|aula/i.test(q)) {
      return uniq([
        { label: 'Para iniciantes', question: 'Qual deles é melhor para iniciante?' },
        { label: 'Quem oferece', question: 'E quem oferece esses cursos?' },
        { label: 'Serviços técnicos', question: 'Quais serviços a Renovação oferece?' },
      ]);
    }
    if (/servi[cç]o|renova[cç]|instala|manuten|c[aâ]mara/i.test(q)) {
      return uniq([
        { label: 'Empresa para engenharia', question: 'Qual empresa procurar para engenharia?' },
        { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
        { label: 'Conhecer Neurofrigo', question: 'O que é o Neurofrigo Command IA?' },
      ]);
    }
    if (/omnia|holding|empresa|ecossistema/i.test(q)) {
      return uniq([
        { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
        { label: 'Ver serviços', question: 'Quais serviços vocês oferecem?' },
        { label: 'Indicar empresa', question: 'Qual empresa cuida de engenharia e projetos?' },
      ]);
    }
    return uniq([
      { label: 'Próximo passo', question: 'Qual o próximo passo recomendado?' },
      { label: 'Ver cursos', question: 'Quais cursos vocês oferecem?' },
    ]);
  }

  if (key === 'tutor') {
    return uniq([
      { label: 'Exemplo prático', question: 'Me dê um exemplo.' },
      { label: 'Mais simples', question: 'Explique de outro jeito, mais simples.' },
      { label: 'Verificar compreensão', question: 'Faça uma pergunta para ver se eu entendi.' },
    ]);
  }

  if (key === 'engineering') {
    if (input.intent === 'troubleshooting' || /diagn|falha|alarme|problema/i.test(q)) {
      return uniq([
        {
          label: 'Continuar diagnóstico',
          question: 'Quais dados de pressão e temperatura você precisa para continuar?',
        },
        {
          label: 'Comparar alternativas',
          question: 'Pode comparar as duas alternativas técnicas?',
        },
      ]);
    }
    return uniq([
      { label: 'Aprofundar', question: 'Pode detalhar os critérios técnicos principais?' },
      { label: 'Comparar', question: 'Pode comparar as alternativas disponíveis?' },
    ]);
  }

  if (key === 'commercial') {
    return uniq([
      { label: 'Estruturar necessidade', question: 'Me ajude a estruturar a necessidade.' },
      { label: 'Comparar soluções', question: 'Pode comparar as soluções aplicáveis?' },
    ]);
  }

  return [];
}
