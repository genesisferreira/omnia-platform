import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractPdf } from './extract';

function buildSimplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects: string[] = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources<< /Font<< /F1 4 0 R >> >> >>endobj',
  );
  objects.push('4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj');
  objects.push(
    `5 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream\nendobj`,
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

describe('pdf extract', () => {
  it('extracts text from minimal Helvetica PDF', async () => {
    const buf = buildSimplePdf('Omnia Knowledge Intelligence Seed PDF');
    const result = await extractPdf(buf, { filename: 'seed.pdf', mimeType: 'application/pdf' });
    assert.ok(result.text.includes('Omnia Knowledge Intelligence'));
    assert.equal(result.meta.pages, 1);
    assert.ok(result.meta.checksum.length === 64);
  });
});
