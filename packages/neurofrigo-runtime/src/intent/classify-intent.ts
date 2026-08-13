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
      return 'Entregue uma definição clara em linguagem natural, com 1–2 frases e contexto útil.';
    case 'procedural':
      return 'Organize em passos claros e numerados, sem jargão interno.';
    case 'comparative':
      return 'Compare de forma estruturada (semelhanças e diferenças) em linguagem acessível.';
    case 'troubleshooting':
      return 'Estruture: sintoma → possíveis causas → verificações. Peça dados críticos se faltarem. Inclua nota de segurança se houver.';
    case 'summary':
      return 'Resuma de forma conversacional os pontos essenciais, sem listar IDs ou markers.';
    case 'review':
      return 'Faça uma revisão objetiva em checklist dos pontos-chave autorizados.';
    case 'conceptual':
      return 'Explique o conceito de forma didática e natural, ancorada nas fontes.';
    case 'explanation':
    default:
      return 'Explique de forma natural e didática; termine com um próximo passo útil quando fizer sentido.';
  }
}
