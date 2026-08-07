import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyOfficialDocument,
  detectResourceType,
  extractPptx,
  isPendingArchive,
} from './index';

/** ZIP store (method 0) mínimo com um slide. */
function buildTinyPptx(text: string): Buffer {
  const files: Record<string, string> = {
    '[Content_Types].xml':
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>',
    'ppt/slides/slide1.xml': `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="t"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  };
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // store
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const full = Buffer.concat([local, nameBuf, data]);
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(full);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += full.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

describe('epic10 extract + classify', () => {
  it('detects office types', () => {
    assert.equal(detectResourceType({ filename: 'a.docx' }), 'docx');
    assert.equal(detectResourceType({ filename: 'a.pptx' }), 'pptx');
    assert.equal(detectResourceType({ filename: 'a.pdf' }), 'pdf');
  });

  it('marks rar as pending archive', () => {
    assert.equal(isPendingArchive('nova-pasta-1.rar'), true);
    assert.equal(isPendingArchive('doc.docx'), false);
  });

  it('classifies course and institutional docs', () => {
    const course = classifyOfficialDocument({
      filename: 'neurofrigo-controle-ia-refrigeracao-co2.docx',
      textPreview: 'sistema transcritico CO2 Neuro Frigo',
    });
    assert.equal(course.companySlug, 'neurofrigo');
    assert.ok(course.allowedAgents.includes('refrigeration'));

    const plan = classifyOfficialDocument({
      filename: 'omnia-plataforma-plano-implantacao-fase1.docx',
      textPreview: 'Omnia Platform Plano de Implantacao Fase 1',
    });
    assert.equal(plan.companySlug, 'omnia-frigo-holding');
    assert.ok(plan.allowedAgents.includes('commercial'));
  });

  it('extracts pptx text', async () => {
    const out = await extractPptx(buildTinyPptx('Hello EPIC10 PPTX'), {
      filename: 't.pptx',
    });
    assert.match(out.text, /Hello EPIC10 PPTX/);
    assert.equal(out.meta.pages, 1);
  });
});
