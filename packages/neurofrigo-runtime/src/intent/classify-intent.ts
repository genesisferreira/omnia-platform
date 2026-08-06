import type { QuestionIntent } from '../domain/types';

const RULES: Array<{ intent: QuestionIntent; patterns: RegExp[] }> = [
  {
    intent: 'definition',
    patterns: [/\bo que é\b/i, /\bdefina\b/i, /\bdefinição\b/i, /\bsignifica\b/i],
  },
  {
    intent: 'summary',
    patterns: [/\bresuma\b/i, /\bresumo\b/i, /\bsintetize\b/i, /\bem poucas palavras\b/i],
  },
  {
    intent: 'comparative',
    patterns: [/\bdiferen[cç]a\b/i, /\bcompar/i, /\bversus\b/i, /\bvs\.?\b/i, /\bou\b.+\bou\b/i],
  },
  {
    intent: 'troubleshooting',
    patterns: [
      /\berro\b/i,
      /\bfalha\b/i,
      /\bproblema\b/i,
      /\bn[aã]o (liga|funciona|parte)\b/i,
      /\bdiagn[oó]st/i,
      /\bcausa\b/i,
    ],
  },
  {
    intent: 'procedural',
    patterns: [
      /\bcomo (fazer|proceder|instalar|ajustar|medir|calcular)\b/i,
      /\bpasso a passo\b/i,
      /\bprocedimento\b/i,
      /\betapas?\b/i,
    ],
  },
  {
    intent: 'review',
    patterns: [/\brevise\b/i, /\brevis[aã]o\b/i, /\brelembre\b/i, /\bchecklist\b/i],
  },
  {
    intent: 'explanation',
    patterns: [/\bexplique\b/i, /\bpor que\b/i, /\bporque\b/i, /\bcomo funciona\b/i],
  },
  {
    intent: 'conceptual',
    patterns: [/\bconceito\b/i, /\bprinc[ií]pio\b/i, /\bfundamento\b/i, /\bteoria\b/i],
  },
];

/**
 * Classificador heurístico de intenção — sem LLM.
 */
export function classifyIntent(question: string): QuestionIntent {
  const q = question.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(q))) return rule.intent;
  }
  if (/^(o que|qual|quais)\b/i.test(q)) return 'definition';
  if (/^como\b/i.test(q)) return 'explanation';
  return 'explanation';
}

export const INTENT_LABELS: Record<QuestionIntent, string> = {
  conceptual: 'Conceitual',
  procedural: 'Procedimental',
  comparative: 'Comparativa',
  troubleshooting: 'Troubleshooting',
  definition: 'Definição',
  review: 'Revisão',
  explanation: 'Explicação',
  summary: 'Resumo',
};

export function intentSystemAddon(intent: QuestionIntent): string {
  switch (intent) {
    case 'definition':
      return 'Foque em uma definição clara e objetiva, com 1–2 frases e um exemplo do material.';
    case 'procedural':
      return 'Organize a resposta em passos numerados, na ordem do procedimento do material.';
    case 'comparative':
      return 'Compare lado a lado (semelhanças e diferenças) usando lista ou tabela textual.';
    case 'troubleshooting':
      return 'Estruture: sintoma → possíveis causas (do material) → verificações. Inclua nota de segurança se houver.';
    case 'summary':
      return 'Entregue um resumo curto com bullets dos pontos principais do material.';
    case 'review':
      return 'Faça uma revisão objetiva em checklist dos pontos-chave da aula/curso.';
    case 'conceptual':
      return 'Explique o conceito com base no material, usando título e bullets curtos.';
    case 'explanation':
    default:
      return 'Explique de forma didática com título, bullets e observação técnica quando fizer sentido.';
  }
}
