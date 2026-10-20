import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectMarketplaceFileType, isMarketplacePdfUploadEnabled } from './files';

const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => new TextEncoder().encode(value);

describe('detectMarketplaceFileType', () => {
  it('reconhece JPEG, PNG, WebP e PDF pela assinatura', () => {
    assert.equal(
      detectMarketplaceFileType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))?.mime,
      'image/jpeg',
    );
    assert.equal(
      detectMarketplaceFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))?.mime,
      'image/png',
    );
    assert.equal(
      detectMarketplaceFileType(text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))?.mime,
      'image/webp',
    );
    assert.equal(detectMarketplaceFileType(text('%PDF-1.7\n'))?.kind, 'pdf');
  });

  it('rejeita SVG, HTML, executável e arquivos vazios', () => {
    assert.equal(
      detectMarketplaceFileType(text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')),
      null,
    );
    assert.equal(detectMarketplaceFileType(text('<!doctype html><script>alert(1)</script>')), null);
    assert.equal(detectMarketplaceFileType(bytes(0x4d, 0x5a, 0x90, 0x00)), null);
    assert.equal(detectMarketplaceFileType(new Uint8Array()), null);
    assert.equal(detectMarketplaceFileType(text('RIFF\u0000\u0000\u0000\u0000WAVE')), null);
  });
});

describe('isMarketplacePdfUploadEnabled', () => {
  it('fica desligado por padrão e com qualquer valor diferente de "true"', () => {
    assert.equal(isMarketplacePdfUploadEnabled({}), false);
    for (const value of ['', 'false', '0', '1', 'yes', 'on', 'enabled']) {
      assert.equal(isMarketplacePdfUploadEnabled({ MARKETPLACE_PDF_UPLOAD_ENABLED: value }), false);
    }
  });

  it('liga somente com "true" explícito', () => {
    assert.equal(isMarketplacePdfUploadEnabled({ MARKETPLACE_PDF_UPLOAD_ENABLED: 'true' }), true);
    assert.equal(isMarketplacePdfUploadEnabled({ MARKETPLACE_PDF_UPLOAD_ENABLED: ' TRUE ' }), true);
  });
});
