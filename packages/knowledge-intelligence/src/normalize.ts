/**
 * Normalização conservadora — remove ruído sem destruir estrutura.
 */
export function normalizeExtractedText(input: string): string {
  let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Form-feed / page breaks → parágrafo
  text = text.replace(/\f+/g, '\n\n');

  // Headers/footers comuns numerados (linhas só com número de página)
  text = text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return false;
      if (/^\d+\s*\/\s*\d+$/.test(t)) return false;
      return true;
    })
    .join('\n');

  // Colapsa espaços horizontais; preserva quebras de parágrafo
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n');

  // Remove linhas vazias em excesso (máx. 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Dedup de linhas consecutivas idênticas (headers repetidos)
  const lines = text.split('\n');
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped.length && deduped[deduped.length - 1] === line && line.trim() !== '') {
      continue;
    }
    deduped.push(line);
  }

  return deduped.join('\n').trim();
}
