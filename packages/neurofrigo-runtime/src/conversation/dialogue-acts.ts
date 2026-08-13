import type { ConversationState, DialogueAct } from './dialogue-types';

/**
 * Normalize common typos / informal PT without correcting the user aloud.
 */
export function normalizeUserUtterance(raw: string): string {
  let q = String(raw || '').trim();
  q = q
    .replace(/\bcursoa\b/gi, 'cursos')
    .replace(/\bcervi[cç]os\b/gi, 'serviços')
    .replace(/\bempres\b/gi, 'empresa')
    .replace(/\badequadro\b/gi, 'adequado')
    .replace(/\bqro\b/gi, 'quero')
    .replace(/\bvc\b/gi, 'você')
    .replace(/\bpra\b/gi, 'para')
    .replace(/\btb\b/gi, 'também')
    .replace(/\bcontatoo?\b/gi, 'contato')
    .replace(/\bqual\s+e\b/gi, 'qual é')
    .replace(/\bresponsavel\b/gi, 'responsável');
  return q;
}

export function classifyDialogueAct(input: {
  question: string;
  state: ConversationState;
}): DialogueAct {
  const q = normalizeUserUtterance(input.question);
  const state = input.state;

  if (/^\s*(sim|isso|isso mesmo|quero|pode|claro|ok|beleza|vamos|afirmativo)\b/i.test(q)) {
    return 'CONFIRMATION';
  }
  if (/^\s*(n[aã]o|agora n[aã]o|negativo)\b/i.test(q)) {
    return 'DENIAL';
  }
  if (
    /n[aã]o entendi|mais simples|explica|reexplique|me d[eê]\s+um exemplo|me testa|fa[cç]a uma pergunta/i.test(
      q,
    )
  ) {
    return 'CLARIFICATION_REQUEST';
  }
  if (/contato|falar com|encaminh|humano|algu[eé]m|quero falar/i.test(q)) {
    return /encaminh|humano|falar com (a equipe|algu[eé]m|eles|ela)/i.test(q)
      ? 'HANDOFF_REQUEST'
      : 'CONTACT_REQUEST';
  }
  if (/recomend|indique|melhor para|mais adequado|qual (curso|deles)/i.test(q)) {
    return 'RECOMMENDATION_REQUEST';
  }
  if (/cursos?|cat[aá]logo|forma[cç][aã]o|treinamento/i.test(q)) {
    return 'CATALOG_REQUEST';
  }
  if (/servi[cç]os?/i.test(q)) {
    return 'SERVICE_REQUEST';
  }
  if (/como (voc[eê]|vc) pode|o que (voc[eê]|vc) faz|capacidades/i.test(q)) {
    return 'CAPABILITY_REQUEST';
  }
  if (
    /\d+\s*anos?|trabalho (h[aá]|com)|j[aá] trabalho|sou iniciante|comercial|industrial|climatiza|migrar|quero ir para/i.test(
      q,
    ) &&
    (state.currentIntent === 'course_recommendation' ||
      state.pendingQuestion ||
      state.pendingAction === 'COURSE_RECOMMENDATION' ||
      /curso|forma[cç]/i.test(state.lastAssistantText || ''))
  ) {
    return 'QUALIFICATION_INFORMATION';
  }
  if (/\d+\s*lojas?|c[aâ]mara|consumo|energia|supermercado/i.test(q)) {
    return 'COMMERCIAL_DISCOVERY';
  }
  if (/c[aâ]mara|temperatura|suc[cç]|descarga|psi|R404|setpoint|-?\d+\s*°?C?/i.test(q)) {
    return 'TECHNICAL_DIAGNOSTIC';
  }
  if (/ela|eles|esse|essa|aquele|empresa respons|e depois|e os /i.test(q)) {
    return 'REFERENCE';
  }
  if (/o que [eé]|omnia|holding|ecossistema/i.test(q)) {
    return 'INFORMATION_REQUEST';
  }
  if (/explic|conceito|aula|superaquec/i.test(q)) {
    return 'EDUCATIONAL_EXPLANATION';
  }
  if (state.currentIntent && q.length < 48) {
    return 'FOLLOW_UP';
  }
  return 'INFORMATION_REQUEST';
}
