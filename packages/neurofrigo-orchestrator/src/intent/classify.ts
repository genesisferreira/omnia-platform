import type { OrchestratorIntent } from '../domain/types';

type IntentHit = { intent: OrchestratorIntent; confidence: number };

const RULES: Array<{ intent: OrchestratorIntent; patterns: RegExp[]; weight: number }> = [
  {
    intent: 'assessment',
    patterns: [/\bprova\b/i, /\bquiz\b/i, /\bavalia/i, /\bgabarito\b/i, /\bquest[aã]o\b/i],
    weight: 0.95,
  },
  {
    intent: 'refrigeration',
    patterns: [
      /\brefrigera/i,
      /\bhvac/i,
      /\bcompress/i,
      /\bevapor/i,
      /\bcondens/i,
      /\bv[aá]lvula\s+de\s+expans/i,
      /\bciclo\s+de\s+compress/i,
    ],
    weight: 0.92,
  },
  {
    intent: 'neurofrigo_tech',
    patterns: [/\bneurofrigo\b/i, /\bsensor/i, /\bmonitoramento\b/i, /\bia\s+aplicada\b/i],
    weight: 0.9,
  },
  {
    intent: 'electrical',
    patterns: [
      /\bel[eé]tric/i,
      /\bclp\b/i,
      /\binversor/i,
      /\bpainel\b/i,
      /\bcomando/i,
      /\bautoma/i,
    ],
    weight: 0.9,
  },
  {
    intent: 'radar',
    patterns: [/\bradar\b/i, /\binova/i, /\btend[eê]ncia\s+tecnol/i],
    weight: 0.85,
  },
  {
    intent: 'lab',
    patterns: [/\blaborat/i, /\bprojeto\s+pr[aá]tico\b/i, /\bestudo\s+de\s+caso\b/i],
    weight: 0.85,
  },
  {
    intent: 'content_production',
    patterns: [
      /\broteiro\b/i,
      /\bplano\s+de\s+aula\b/i,
      /\bmaterial\s+did[aá]tico\b/i,
      /\bprodu[cç][aã]o\s+de\s+conte[uú]do\b/i,
    ],
    weight: 0.88,
  },
  {
    intent: 'tutoring',
    patterns: [
      /\btutor/i,
      /\brevis/i,
      /\bestudar\b/i,
      /\bplano\s+de\s+estudo\b/i,
      /\bn[aã]o\s+entendi\b/i,
    ],
    weight: 0.8,
  },
  {
    intent: 'commercial',
    patterns: [/\bproposta\b/i, /\bpre[cç]o\b/i, /\bcomercial\b/i, /\bor[cç]amento\b/i],
    weight: 0.82,
  },
  {
    intent: 'partnership',
    patterns: [/\bparceir/i, /\bfranquia\b/i],
    weight: 0.8,
  },
  {
    intent: 'support',
    patterns: [/\bsuporte\b/i, /\blogin\b/i, /\bacesso\b/i, /\bsenha\b/i],
    weight: 0.8,
  },
  {
    intent: 'enrollment',
    patterns: [/\bmatri/i, /\binscri/i],
    weight: 0.78,
  },
  {
    intent: 'courses',
    patterns: [/\bcursos?\b/i, /\baulas?\b/i, /\bm[oó]dulos?\b/i],
    weight: 0.7,
  },
  {
    intent: 'institutional',
    patterns: [
      /\bomnia\b/i,
      /\bempresa\b/i,
      /\binstitucional\b/i,
      /\bsobre\s+(a\s+)?plataforma\b/i,
    ],
    weight: 0.65,
  },
  {
    intent: 'human_handoff',
    patterns: [/\batendimento\s+humano\b/i, /\bfalar\s+com\s+(um\s+)?humano\b/i],
    weight: 0.9,
  },
  {
    intent: 'engineering_services',
    patterns: [/\bengenhar/i, /\bservi[cç]o\s+t[eé]cnico\b/i],
    weight: 0.75,
  },
];

export function classifyOrchestratorIntent(question: string): IntentHit {
  let best: IntentHit = { intent: 'general', confidence: 0.35 };
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(question))) {
      if (rule.weight > best.confidence) {
        best = { intent: rule.intent, confidence: rule.weight };
      }
    }
  }
  return best;
}
