import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deflateSync } from 'node:zlib';

import { scanPdfForActiveContent } from '../lib/marketplace-pdf-scan';

const pdf = (body: string | Buffer) =>
  Buffer.concat([
    Buffer.from('%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\n', 'latin1'),
    typeof body === 'string' ? Buffer.from(body, 'latin1') : body,
    Buffer.from('\nxref\n0 1\ntrailer<<>>\n%%EOF\n', 'latin1'),
  ]);

const streamOf = (content: string) =>
  Buffer.concat([
    Buffer.from('2 0 obj<</Filter/FlateDecode>>stream\n', 'latin1'),
    deflateSync(Buffer.from(content, 'latin1')),
    Buffer.from('\nendstream endobj', 'latin1'),
  ]);

describe('inspeção heurística de PDF', () => {
  it('aceita PDF simples, inclusive com stream comprimido inofensivo', () => {
    assert.deepEqual(scanPdfForActiveContent(pdf('')), { ok: true });
    assert.deepEqual(scanPdfForActiveContent(pdf(streamOf('BT /F1 12 Tf (Ficha tecnica) Tj ET'))), {
      ok: true,
    });
  });

  it('recusa JavaScript, Launch, anexos embutidos, XFA e envio de formulário', () => {
    for (const body of [
      '<</OpenAction<</S/JavaScript/JS(app.alert(1))>>>>',
      '<</S/Launch/F(cmd.exe)>>',
      '<</Names<</EmbeddedFiles 3 0 R>>>>',
      '<</AcroForm<</XFA 4 0 R>>>>',
      '<</S/SubmitForm/F(http://x)>>',
    ]) {
      assert.deepEqual(
        scanPdfForActiveContent(pdf(body)),
        { ok: false, reason: 'active_content' },
        body,
      );
    }
  });

  it('recusa conteúdo ativo escondido em stream comprimido ou com escape #xx', () => {
    assert.equal(scanPdfForActiveContent(pdf(streamOf('<</S/JavaScript/JS(x)>>'))).ok, false);
    assert.equal(scanPdfForActiveContent(pdf('<</S/J#61vaScript>>')).ok, false);
  });

  it('recusa PDF criptografado (não inspecionável)', () => {
    assert.deepEqual(scanPdfForActiveContent(pdf('trailer<</Encrypt 9 0 R>>')), {
      ok: false,
      reason: 'encrypted',
    });
  });

  it('não confunde nomes parecidos', () => {
    assert.deepEqual(scanPdfForActiveContent(pdf('<</JSONData 1 /Launcher 2>>')), { ok: true });
  });
});
