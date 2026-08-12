/**
 * Meta / capability questions — answer from Assistant Registry metadata, not RAG.
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
  const description =
    input.description?.trim() ||
    'Sou um assistente do ecossistema Omnia Frigo (cursos, refrigeração, serviços e tecnologia).';
  const caps = (input.capabilities || []).map((c) => c.trim()).filter(Boolean);
  const lines = [
    `Sou o **${name}**.`,
    description,
    '',
    'Posso ajudar com:',
    ...capabilityBullets(key, caps, input.channel),
    '',
    'Pergunte sobre um tema do ecossistema Omnia — respondo com base no material autorizado ao seu perfil.',
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

function capabilityBullets(key: string, caps: string[], channel?: string | null): string[] {
  if (caps.length) {
    return caps.slice(0, 8).map((c) => `- ${humanizeCapability(c)}`);
  }
  if (channel === 'portal_public' || key === 'concierge') {
    return [
      '- Conhecer cursos e formação',
      '- Orientar sobre serviços e empresas do ecossistema',
      '- Explicar temas gerais de refrigeração e Neurofrigo',
      '- Indicar próximos passos de contato (sem CRM automático)',
    ];
  }
  if (key === 'tutor') {
    return [
      '- Explicar o material autorizado do curso/aula',
      '- Revisar conceitos e procedimentos do conteúdo publicado',
      '- Ajudar no estudo com citações do material',
    ];
  }
  if (key === 'commercial') {
    return [
      '- Apresentar soluções e propostas no escopo comercial autorizado',
      '- Orientar próximos passos de relacionamento',
    ];
  }
  if (key === 'engineering') {
    return [
      '- Apoiar diagnóstico técnico com base autorizada',
      '- Comparar abordagens e troubleshooting no escopo liberado',
    ];
  }
  return ['- Responder com base no conteúdo autorizado ao seu perfil'];
}

function humanizeCapability(raw: string): string {
  return raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
