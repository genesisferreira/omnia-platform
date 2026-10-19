import { inflateSync } from 'node:zlib';

/**
 * Inspeção heurística de PDF (não é antivírus): recusa conteúdo ativo e o que não dá para
 * inspecionar. Cobre streams FlateDecode (inclusive object streams) e nomes com escape `#xx`.
 */
const ACTIVE_CONTENT_RE =
  /\/(JavaScript|JS(?![A-Za-z])|Launch|EmbeddedFiles?|RichMedia|XFA|SubmitForm|ImportData|GoToE)(?![A-Za-z])/;
const ENCRYPT_RE = /\/Encrypt(?![A-Za-z])/;
const STREAM_RE = /stream\r?\n/g;
const MAX_STREAMS = 4000;
const MAX_INFLATED_BYTES = 64 * 1024 * 1024;

/** `/J#61vaScript` → `/JavaScript` (nomes PDF aceitam escape hexadecimal). */
function decodeNameEscapes(text: string): string {
  return text.replace(/#([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

export type PdfScanResult =
  { ok: true } | { ok: false; reason: 'encrypted' | 'active_content' | 'too_complex' };

export function scanPdfForActiveContent(buffer: Buffer): PdfScanResult {
  const raw = buffer.toString('latin1');
  const surface = decodeNameEscapes(raw);
  if (ENCRYPT_RE.test(surface)) return { ok: false, reason: 'encrypted' };
  if (ACTIVE_CONTENT_RE.test(surface)) return { ok: false, reason: 'active_content' };

  let inflatedTotal = 0;
  let streams = 0;
  STREAM_RE.lastIndex = 0;
  for (let match = STREAM_RE.exec(raw); match; match = STREAM_RE.exec(raw)) {
    streams += 1;
    if (streams > MAX_STREAMS) return { ok: false, reason: 'too_complex' };
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end === -1) break;
    STREAM_RE.lastIndex = end;
    let inflated: Buffer;
    try {
      inflated = inflateSync(buffer.subarray(start, end), { finishFlush: 2 });
    } catch {
      continue;
    }
    inflatedTotal += inflated.length;
    if (inflatedTotal > MAX_INFLATED_BYTES) return { ok: false, reason: 'too_complex' };
    const text = decodeNameEscapes(inflated.toString('latin1'));
    if (ACTIVE_CONTENT_RE.test(text)) return { ok: false, reason: 'active_content' };
  }
  return { ok: true };
}

export const PDF_SCAN_MESSAGES: Record<Exclude<PdfScanResult, { ok: true }>['reason'], string> = {
  encrypted:
    'PDF protegido por senha/criptografia não é aceito. Envie a ficha técnica sem proteção.',
  active_content:
    'O PDF contém conteúdo ativo (scripts, anexos embutidos ou ações automáticas) e não é aceito. Exporte novamente como PDF simples.',
  too_complex:
    'Não foi possível inspecionar este PDF com segurança. Exporte novamente como PDF simples.',
};
