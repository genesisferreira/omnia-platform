import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

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
    .replace(/<\/a:t>/gi, ' ')
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

async function loadZipEntries(buffer: Buffer): Promise<Map<string, Buffer>> {
  const JSZip = require('jszip') as {
    loadAsync: (data: Buffer) => Promise<{
      files: Record<string, { dir?: boolean; async: (type: 'nodebuffer') => Promise<Buffer> }>;
    }>;
  };
  const zip = await JSZip.loadAsync(buffer);
  const out = new Map<string, Buffer>();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    out.set(name.replace(/\\/g, '/'), await entry.async('nodebuffer'));
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
    const entries = await loadZipEntries(buffer);
    const parts: string[] = [];
    for (const [name, data] of entries) {
      if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
      const cleaned = stripXml(data.toString('utf8'));
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
        opts?.mimeType ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: opts?.filename ?? null,
      language: null,
      pages: Math.max(1, Math.ceil(text.length / 3000)),
    }),
  };
}

/** Extrai texto de slides PPTX (OOXML via JSZip). */
export async function extractPptx(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  const entries = await loadZipEntries(buffer);
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
