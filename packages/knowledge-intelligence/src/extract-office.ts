import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { inflateRawSync } from 'node:zlib';

import type { ExtractMeta, ExtractResult } from './types';

const require = createRequire(import.meta.url);

function checksumOf(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function baseMeta(
  buffer: Buffer,
  partial: Partial<ExtractMeta> & { encoding: string },
): ExtractMeta {
  return {
    pages: partial.pages ?? null,
    byteSize: buffer.length,
    language: partial.language ?? null,
    checksum: checksumOf(buffer),
    encoding: partial.encoding,
    mimeType: partial.mimeType ?? null,
    filename: partial.filename ?? null,
  };
}

function stripXml(text: string): string {
  return text
    .replace(/<a:t[^>]*>/gi, '')
    .replace(/<\/a:t>/gi, ' ')
    .replace(/<w:t[^>]*>/gi, '')
    .replace(/<\/w:t>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lê entradas de um ZIP (DOCX/PPTX) sem dependência externa. */
export function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const uncompSize = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    const compressed = buffer.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(compressed);
    } else if (method === 8) {
      data = inflateRawSync(compressed);
      if (uncompSize && data.length !== uncompSize && uncompSize < 50_000_000) {
        // tamanho informado pelo header local pode ser 0 com data descriptor; aceitar inflate
      }
    } else {
      offset = dataStart + compSize;
      continue;
    }
    out.set(name.replace(/\\/g, '/'), data);
    offset = dataStart + compSize;
  }
  return out;
}

/**
 * Extrai texto de DOCX via mammoth (se disponível) ou fallback OOXML.
 */
export async function extractDocx(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  let text = '';
  try {
    const mammoth = require('mammoth') as {
      extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    text = (result.value || '').trim();
  } catch {
    text = '';
  }

  if (!text) {
    const entries = readZipEntries(buffer);
    const parts: string[] = [];
    for (const [name, data] of entries) {
      if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
      const raw = data.toString('utf8');
      const cleaned = stripXml(raw);
      if (cleaned) parts.push(cleaned);
    }
    text = parts.join('\n\n').trim();
  }

  if (!text) throw new Error('DOCX_EXTRACT_EMPTY');

  return {
    text,
    meta: baseMeta(buffer, {
      encoding: 'utf-8',
      mimeType:
        opts?.mimeType ??
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: opts?.filename ?? null,
      language: null,
      pages: Math.max(1, Math.ceil(text.length / 3000)),
    }),
  };
}

/** Extrai texto de slides PPTX (OOXML). */
export async function extractPptx(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  const entries = readZipEntries(buffer);
  const slideNames = [...entries.keys()]
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!slideNames.length) throw new Error('PPTX_NO_SLIDES');

  const parts: string[] = [];
  for (const name of slideNames) {
    const data = entries.get(name);
    if (!data) continue;
    const cleaned = stripXml(data.toString('utf8'));
    if (cleaned) parts.push(cleaned);
  }

  const text = parts.join('\n\n').trim();
  if (!text) throw new Error('PPTX_EXTRACT_EMPTY');

  return {
    text,
    meta: baseMeta(buffer, {
      encoding: 'utf-8',
      mimeType:
        opts?.mimeType ??
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename: opts?.filename ?? null,
      language: null,
      pages: slideNames.length,
    }),
  };
}
