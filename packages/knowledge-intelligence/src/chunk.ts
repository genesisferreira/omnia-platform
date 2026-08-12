import { DEFAULT_CHUNK_CONFIG, estimateTokens, type ChunkConfig, type TextChunk } from './types';

/**
 * Chunking por janela deslizante com preferência a quebras de parágrafo.
 * Complexidade O(n); adequado a processamento em fila.
 */
export function chunkText(text: string, config: ChunkConfig = DEFAULT_CHUNK_CONFIG): TextChunk[] {
  const maxChars = Math.max(200, config.maxChars);
  const overlap = Math.min(Math.max(0, config.overlapChars), Math.floor(maxChars / 2));
  const source = text.replace(/\r\n/g, '\n').trim();
  if (!source) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < source.length) {
    let end = Math.min(start + maxChars, source.length);

    if (end < source.length) {
      const window = source.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('\n'),
        window.lastIndexOf(' '),
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt;
      }
    }

    const chunkTextValue = source.slice(start, end).trim();
    if (chunkTextValue) {
      const absoluteStart = source.indexOf(chunkTextValue, start);
      const startOffset = absoluteStart >= 0 ? absoluteStart : start;
      const endOffset = startOffset + chunkTextValue.length;
      chunks.push({
        chunkIndex: chunks.length,
        chunkText: chunkTextValue,
        tokenEstimate: estimateTokens(chunkTextValue),
        startOffset,
        endOffset,
      });
    }

    if (end >= source.length) break;
    const next = end - overlap;
    start = next <= start ? end : next;
  }

  return chunks;
}
