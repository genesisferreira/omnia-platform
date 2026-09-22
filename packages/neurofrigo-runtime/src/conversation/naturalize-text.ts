/**
 * Humanize enums / strip mechanical leaks / invisible repetition control (R6).
 */

const LEVEL_MAP: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  expert: 'Especialista',
  basic: 'Básico',
};

export function humanizeLevel(level: string | null | undefined): string | null {
  if (!level) return null;
  const key = String(level).trim().toLowerCase();
  return LEVEL_MAP[key] || level;
}

export function naturalizeUserText(text: string): string {
  let out = String(text || '');
  out = out.replace(/EPIC16_PUBLIC_INSTITUTIONAL_V\d+/gi, '');
  out = out.replace(/\[chunk:[^\]]+\]/gi, '');
  out = out.replace(/\b(RAG|Citations|Routing|PromptBuilder|Policy Engine|Vector Search)\b/gi, '');
  // Strip leaked document structure / markdown headings
  out = out.replace(/^#{1,6}\s*/gm, '');
  out = out.replace(/\n#{1,6}\s+/g, '\n');
  out = out.replace(/##\s*Prop[oó]sito e vis[aã]o[^\n]*/gi, '');
  out = out.replace(/\bn[ií]vel\s+beginner\b/gi, 'nível Iniciante');
  out = out.replace(/\bn[ií]vel\s+intermediate\b/gi, 'nível Intermediário');
  out = out.replace(/\bn[ií]vel\s+advanced\b/gi, 'nível Avançado');
  out = out.replace(/\bn[ií]vel\s+expert\b/gi, 'nível Especialista');
  out = out.replace(/\bbeginner\b/gi, 'Iniciante');
  out = out.replace(/\bintermediate\b/gi, 'Intermediário');
  out = out.replace(/\badvanced\b/gi, 'Avançado');
  out = out.replace(/\bexpert\b/gi, 'Especialista');
  out = out.replace(/Omnia Frigo Holding\s+A\s+Omnia Frigo Holding/gi, 'A Omnia Frigo Holding');
  // Strip visible anti-repetition engine boilerplate if any leaked
  out = out.replace(/J[aá] apresentei[^\n]*/gim, '');
  out = out.replace(/Para n[aã]o repetir[^\n]*/gim, '');
  out = out.replace(/Como j[aá] falei[^\n]*/gim, '');
  out = out.replace(/Vamos avan[cç]ar:?\s*/gim, '');
  out = out.replace(/Me diga o pr[oó]ximo ponto[^\n]*/gim, '');
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

export function significantTokenSet(text: string): Set<string> {
  const norm = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const out = new Set<string>();
  for (const raw of norm.split(/[^a-z0-9]+/)) {
    if (raw.length < 4) continue;
    out.add(raw);
  }
  return out;
}

export function jaccardSimilarity(a: string, b: string): number {
  const A = significantTokenSet(a);
  const B = significantTokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Invisible repetition control — never expose engine boilerplate to the user.
 */
export function applyRepetitionControl(input: {
  candidate: string;
  previousAnswers: string[];
  dialogueIntent?: string | null;
}): string {
  const prev = input.previousAnswers.filter(Boolean).slice(-2);
  if (!prev.length) return input.candidate;

  // Never collapse bounded rejections / not_found into the generic "aprofunde" CTA.
  if (
    /n[aã]o\s+encontrei|n[aã]o\s+vou\s+inventar|suficientemente\s+relacionado|n[aã]o\s+est[aá]\s+presente\s+no\s+material\s+autorizado/i.test(
      input.candidate,
    )
  ) {
    return input.candidate;
  }

  // Short qualification / clarification questions may legitimately repeat the ask.
  if (
    input.candidate.length < 220 &&
    /\?\s*$/.test(input.candidate.trim()) &&
    /course_recommendation|clarification|contact_handoff|commercial_discovery|engineering/i.test(
      String(input.dialogueIntent || ''),
    )
  ) {
    if (jaccardSimilarity(input.candidate, prev[prev.length - 1] || '') > 0.85) {
      return input.candidate.replace(/\?\s*$/, ' — pode responder em uma frase?');
    }
    return input.candidate;
  }
  const maxSim = Math.max(...prev.map((p) => jaccardSimilarity(input.candidate, p)));
  if (maxSim < 0.72) return input.candidate;

  // Contact / handoff: avoid collapsing confirmation into a generic menu.
  if (/contact_handoff/i.test(String(input.dialogueIntent || ''))) {
    if (maxSim < 0.9) return input.candidate;
    return input.candidate;
  }

  // Engineering / technical discovery: never collapse to a generic menu — keep progression.
  if (/engineering/i.test(String(input.dialogueIntent || ''))) {
    if (maxSim < 0.92) return input.candidate;
    const lines = input.candidate
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const novel = lines.filter((l) => jaccardSimilarity(l, prev[prev.length - 1] || '') < 0.55);
    if (novel.length) {
      return novel.join('\n');
    }
    return input.candidate;
  }

  // Prefer progressive continuation without meta commentary.
  if (input.dialogueIntent === 'services') {
    return [
      'No lado técnico, a referência é a Renovação Refrigeração (projeto, instalação, manutenção e retrofit).',
      'Formação fica com Fred do Frio / CTE; tecnologia e IA com Neurofrigo Command IA.',
      '',
      'Qual dessas frentes combina mais com o que você precisa agora?',
    ].join('\n');
  }
  if (input.dialogueIntent === 'institutional_overview') {
    return [
      'Se você me disser o que procura — formação, serviço técnico ou tecnologia — eu te direciono sem repetir o panorama geral.',
    ].join('\n');
  }
  if (input.dialogueIntent === 'teaching_rephrase') {
    const core = input.candidate
      .split(/\n+/)
      .filter((l) => !/j[aá] apresentei|n[aã]o repetir|vamos avan/i.test(l))
      .slice(0, 4)
      .join('\n');
    return (
      core ||
      'Vou usar outra imagem mental: foque no efeito prático do conceito no campo, em uma frase.'
    );
  }

  // Generic: keep only novel trailing content / next-step ask — no lecture about repeating.
  const lines = input.candidate
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) => !/j[aá] apresentei|para n[aã]o repetir|como j[aá] falei|vamos avan[cç]ar/i.test(l),
    );
  const kept = lines.slice(-3).join('\n');
  if (kept && jaccardSimilarity(kept, prev[prev.length - 1] || '') < 0.72) {
    return kept;
  }
  return 'Quer que eu aprofunde um ponto específico disso, ou prefere o próximo passo prático?';
}
