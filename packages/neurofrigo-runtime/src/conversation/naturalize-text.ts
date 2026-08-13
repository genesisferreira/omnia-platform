/**
 * Humanize internal enums / strip mechanical leaks from user-facing text.
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
  out = out.replace(/\bn[ií]vel\s+beginner\b/gi, 'nível Iniciante');
  out = out.replace(/\bn[ií]vel\s+intermediate\b/gi, 'nível Intermediário');
  out = out.replace(/\bn[ií]vel\s+advanced\b/gi, 'nível Avançado');
  out = out.replace(/\bn[ií]vel\s+expert\b/gi, 'nível Especialista');
  out = out.replace(/\bbeginner\b/gi, 'Iniciante');
  out = out.replace(/\bintermediate\b/gi, 'Intermediário');
  out = out.replace(/\badvanced\b/gi, 'Avançado');
  out = out.replace(/\bexpert\b/gi, 'Especialista');
  // "Omnia Frigo Holding A Omnia Frigo Holding é"
  out = out.replace(/Omnia Frigo Holding\s+A\s+Omnia Frigo Holding/gi, 'A Omnia Frigo Holding');
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
 * If the new answer largely repeats a previous assistant turn, rewrite toward progress.
 */
export function applyRepetitionControl(input: {
  candidate: string;
  previousAnswers: string[];
  dialogueIntent?: string | null;
}): string {
  const prev = input.previousAnswers.filter(Boolean).slice(-2);
  if (!prev.length) return input.candidate;
  const maxSim = Math.max(...prev.map((p) => jaccardSimilarity(input.candidate, p)));
  if (maxSim < 0.72) return input.candidate;

  if (input.dialogueIntent === 'services') {
    return [
      'Além da visão geral do ecossistema, os serviços técnicos ficam com a **Renovação Refrigeração** (engenharia, instalação, manutenção e retrofit).',
      '',
      'Formação fica com Fred do Frio / CTE, e tecnologia/IA com Neurofrigo Command IA.',
      '',
      'Quer que eu detalhe o serviço técnico para o seu tipo de instalação?',
    ].join('\n');
  }
  if (input.dialogueIntent === 'institutional_overview') {
    return [
      'Já apresentei o panorama da Omnia. Posso seguir por um caminho específico:',
      '',
      '- cursos publicados',
      '- serviços técnicos',
      '- empresa ideal para o seu caso',
      '',
      'Qual desses você prefere agora?',
    ].join('\n');
  }
  if (input.dialogueIntent === 'teaching_rephrase') {
    return [
      'Vou explicar de outro jeito, mais direto:',
      '',
      input.candidate.split(/\n+/).slice(0, 3).join('\n'),
      '',
      'Se ainda estiver confuso, diga qual parte travou que eu uso um exemplo.',
    ].join('\n');
  }
  return [
    'Para não repetir o que já mostrei, vamos avançar:',
    '',
    input.candidate.split(/\n+/).slice(0, 4).join('\n'),
    '',
    'Me diga o próximo ponto que você quer aprofundar.',
  ].join('\n');
}
