import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chunkText } from './chunk.js';
import { extractTxt, sha256Hex } from './extract.js';
import { normalizeExtractedText } from './normalize.js';

describe('knowledge-intelligence pipeline units', () => {
  it('normalizes whitespace and page markers', () => {
    const raw = 'Title\n\n\nPage 1 of 2\n\nHello   world\nHello   world\n\n\n\nEnd';
    const out = normalizeExtractedText(raw);
    assert.ok(!out.includes('Page 1 of 2'));
    assert.ok(out.includes('Hello world'));
    assert.equal(out.includes('\n\n\n'), false);
  });

  it('chunks with overlap and estimates tokens', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Parágrafo número ${i}. Conteúdo de teste.`).join(
      '\n\n',
    );
    const chunks = chunkText(text, { maxChars: 180, overlapChars: 40 });
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0]?.chunkIndex, 0);
    assert.ok((chunks[0]?.tokenEstimate ?? 0) > 0);
    assert.ok((chunks[0]?.endOffset ?? 0) > (chunks[0]?.startOffset ?? 0));
  });

  it('extracts utf-8 text and checksum', async () => {
    const buf = Buffer.from('Omnia KI extract\n', 'utf8');
    const result = await extractTxt(buf, { filename: 'a.txt', mimeType: 'text/plain' });
    assert.ok(result.text.includes('Omnia KI extract'));
    assert.equal(result.meta.checksum, sha256Hex(buf));
    assert.equal(result.meta.encoding, 'utf-8');
  });
});
