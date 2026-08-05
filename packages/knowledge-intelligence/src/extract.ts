import { createHash } from 'node:crypto';

import type { ExtractMeta, ExtractResult } from './types.js';

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function detectResourceType(args: {
  mimeType?: string | null;
  filename?: string | null;
}): 'pdf' | 'txt' | 'markdown' | null {
  const mime = (args.mimeType || '').toLowerCase();
  const name = (args.filename || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('markdown') || name.endsWith('.md') || name.endsWith('.markdown')) {
    return 'markdown';
  }
  if (mime.startsWith('text/') || name.endsWith('.txt')) return 'txt';
  return null;
}

function baseMeta(
  buffer: Buffer,
  partial: Partial<ExtractMeta> & { encoding: string },
): ExtractMeta {
  return {
    pages: partial.pages ?? null,
    byteSize: buffer.length,
    language: partial.language ?? null,
    checksum: sha256Hex(buffer),
    encoding: partial.encoding,
    mimeType: partial.mimeType ?? null,
    filename: partial.filename ?? null,
  };
}

export async function extractTxt(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  const text = buffer.toString('utf8');
  return {
    text,
    meta: baseMeta(buffer, {
      encoding: 'utf-8',
      mimeType: opts?.mimeType ?? 'text/plain',
      filename: opts?.filename ?? null,
      language: null,
      pages: 1,
    }),
  };
}

export async function extractMarkdown(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  const text = buffer.toString('utf8');
  return {
    text,
    meta: baseMeta(buffer, {
      encoding: 'utf-8',
      mimeType: opts?.mimeType ?? 'text/markdown',
      filename: opts?.filename ?? null,
      language: null,
      pages: 1,
    }),
  };
}

export async function extractPdf(
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  // pdf-parse is CJS; dynamic import for ESM consumers.
  const mod = await import('pdf-parse');
  const pdfParse = (mod as { default?: (b: Buffer) => Promise<{ text: string; numpages: number }> })
    .default;
  if (typeof pdfParse !== 'function') {
    throw new Error('PDF_PARSE_UNAVAILABLE');
  }
  const data = await pdfParse(buffer);
  return {
    text: data.text || '',
    meta: baseMeta(buffer, {
      encoding: 'utf-8',
      mimeType: opts?.mimeType ?? 'application/pdf',
      filename: opts?.filename ?? null,
      language: null,
      pages: data.numpages ?? null,
    }),
  };
}

export async function extractByType(
  type: 'pdf' | 'txt' | 'markdown',
  buffer: Buffer,
  opts?: { mimeType?: string | null; filename?: string | null },
): Promise<ExtractResult> {
  if (type === 'pdf') return extractPdf(buffer, opts);
  if (type === 'markdown') return extractMarkdown(buffer, opts);
  return extractTxt(buffer, opts);
}
