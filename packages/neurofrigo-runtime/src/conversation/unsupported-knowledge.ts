/**
 * Detect invented / unsupported “secret formula” style questions.
 * Used to short-circuit synthesis so session history cannot leak lesson dumps.
 */
export function isUnsupportedInventionQuestion(question: string): boolean {
  const q = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/formula\s+secreta|inexistente|xyz[-\s]?\d+|resetar\s+ecu|procedimento\s+secreto/.test(q)) {
    return true;
  }
  if (
    /(nao\s+existe|inventad|ficcicio)/.test(q) &&
    /(refrigerante|formula|procedimento|ecu)/.test(q)
  ) {
    return true;
  }
  return false;
}

/** Bounded rejection — never invent formulas/procedures outside authorized material. */
export function unsupportedKnowledgeRejection(): string {
  return [
    'Esse conteúdo não está presente no material autorizado deste curso e não vou inventar uma fórmula ou procedimento.',
    'Posso ajudar com os conceitos de refrigeração disponíveis na aula.',
  ].join(' ');
}

export function looksLikeBoundedRejection(text: string): boolean {
  const t = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return (
    /nao encontrei|nao vou inventar|suficientemente relacionado|nao esta presente no material autorizado/.test(
      t,
    ) || /material autorizado/.test(t)
  );
}
