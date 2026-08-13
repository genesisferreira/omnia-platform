/**
 * Meta / capability questions — answer from Assistant Registry metadata, not RAG.
 * Never expose internal engine capabilities (RAG, Citations, Routing, etc.).
 */

const META_PATTERNS: RegExp[] = [
  /^\s*como\s+(voc[eê]|vc)\s+pode\s+me\s+ajudar\??\s*$/i,
  /^\s*quem\s+(é|e)\s+(voc[eê]|vc)\??\s*$/i,
  /^\s*o\s+que\s+(voc[eê]|vc)\s+faz\??\s*$/i,
  /^\s*quais\s+(s[aã]o\s+)?suas\s+capacidades\??\s*$/i,
  /^\s*o\s+que\s+(voc[eê]|vc)\s+pode\s+fazer\??\s*$/i,
  /^\s*em\s+que\s+(voc[eê]|vc)\s+pode\s+me\s+ajudar\??\s*$/i,
  /^\s*how\s+can\s+you\s+help\??\s*$/i,
  /^\s*what\s+can\s+you\s+do\??\s*$/i,
];

/** Technical capability keys that must never be shown to end users. */
const INTERNAL_CAPABILITY_KEYS = new Set([
  'rag',
  'citations',
  'routing',
  'vector',
  'vector_search',
  'vector-search',
  'prompt',
  'prompt_builder',
  'policy',
  'policy_engine',
  'retrieval',
  'embedding',
  'topk',
  'chunk',
]);

export function isCapabilityQuestion(question: string): boolean {
  const q = question.trim();
  if (!q || q.length > 160) return false;
  return META_PATTERNS.some((re) => re.test(q));
}

export function buildCapabilityAnswer(input: {
  assistantKey?: string | null;
  assistantName?: string | null;
  description?: string | null;
  capabilities?: string[] | null;
  channel?: string | null;
}): string {
  const key = (input.assistantKey || 'assistant').toLowerCase();
  const name = input.assistantName?.trim() || defaultName(key);
  const presentation = capabilityPresentation(key, input.channel);
  const description = input.description?.trim() || presentation.blurb;

  const lines = [
    `Sou o **${name}**.`,
    description,
    '',
    presentation.intro,
    ...presentation.bullets.map((b) => `- ${b}`),
    '',
    presentation.close,
  ];
  return lines.join('\n');
}

function defaultName(key: string): string {
  switch (key) {
    case 'concierge':
      return 'Concierge Omnia';
    case 'tutor':
      return 'Tutor';
    case 'commercial':
      return 'Assistente Comercial';
    case 'engineering':
      return 'Assistente de Engenharia';
    default:
      return key;
  }
}

function capabilityPresentation(
  key: string,
  channel?: string | null,
): { blurb: string; intro: string; bullets: string[]; close: string } {
  if (channel === 'portal_public' || key === 'concierge') {
    return {
      blurb:
        'Assistente de acolhimento e orientação no ecossistema Omnia Frigo — cursos, serviços, empresas e refrigeração.',
      intro: 'Posso ajudar você a:',
      bullets: [
        'conhecer cursos e treinamentos do catálogo público',
        'entender serviços das empresas do grupo (Renovação, Fred do Frio, CTE, Neurofrigo)',
        'encontrar a empresa ou formação mais adequada ao seu objetivo',
        'obter informações institucionais sobre a Omnia Frigo Holding',
      ],
      close:
        'Pergunte sobre cursos, serviços ou o ecossistema — respondo com base nas informações públicas autorizadas.',
    };
  }
  if (key === 'tutor') {
    return {
      blurb: 'Assistente de aprendizagem com base no material autorizado do curso e da aula.',
      intro: 'Posso ajudar você a:',
      bullets: [
        'explicar conteúdos e tirar dúvidas das aulas',
        'revisar conceitos com exemplos do material',
        'criar exercícios simples para verificar compreensão',
        'montar um plano de estudo a partir do que está publicado',
      ],
      close:
        'Traga a dúvida da aula atual — explico de forma clara e ancorada no material autorizado.',
    };
  }
  if (key === 'commercial') {
    return {
      blurb: 'Consultor de soluções do ecossistema Omnia para necessidades comerciais.',
      intro: 'Posso ajudar você a:',
      bullets: [
        'entender sua necessidade e o contexto da operação',
        'apresentar soluções do ecossistema aplicáveis ao seu caso',
        'comparar alternativas com base no material autorizado',
        'estruturar os próximos passos de uma proposta (sem CRM automático)',
      ],
      close: 'Conte o cenário (porte, objetivo, restrições) que eu oriento com segurança.',
    };
  }
  if (key === 'engineering') {
    return {
      blurb: 'Especialista técnico para análises, troubleshooting e comparação de soluções.',
      intro: 'Posso ajudar você a:',
      bullets: [
        'analisar informações técnicas da base autorizada',
        'estruturar troubleshooting sem inventar medições',
        'comparar alternativas técnicas com critérios claros',
        'pedir os dados críticos quando faltarem para um diagnóstico seguro',
      ],
      close:
        'Descreva o sistema ou o sintoma — avanço com evidência e perguntas de diagnóstico quando necessário.',
    };
  }
  return {
    blurb: 'Assistente do ecossistema Omnia Frigo.',
    intro: 'Posso ajudar com:',
    bullets: ['responder com base no conteúdo autorizado ao seu perfil'],
    close: 'Pergunte sobre um tema do ecossistema Omnia.',
  };
}

/** Exposed for tests — filters registry capability keys to human labels only when safe. */
export function humanizeCapability(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (!key || INTERNAL_CAPABILITY_KEYS.has(key)) return null;
  if (/^(rag|citation|routing|vector|prompt|policy|retrieval)/i.test(key)) return null;
  const map: Record<string, string> = {
    study_plan: 'montar plano de estudo',
    troubleshooting: 'apoiar diagnóstico técnico',
    comparison: 'comparar alternativas',
    proposal: 'estruturar propostas',
  };
  if (map[key]) return map[key];
  return raw.replace(/[_-]+/g, ' ').trim();
}
