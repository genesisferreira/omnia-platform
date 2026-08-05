/**
 * Testes Epic 03 — Knowledge Intelligence (pipeline sem embeddings).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractPdf } from '@omnia/knowledge-intelligence';
import { getPayload } from 'payload';

import config from '../../payload.config';
import { buildKiSeedPdf } from '../services/knowledge-intelligence/fixtures';
import { processLearningResource } from '../services/knowledge-intelligence/pipeline';

describe('knowledge-intelligence e2e', () => {
  it('PDF → Learning Resource → extract → normalize → chunks → KnowledgeDocument → queue', async () => {
    // pdf-parse deve rodar antes do boot Payload neste processo.
    const pdf = buildKiSeedPdf(
      'Omnia KI E2E. Conteudo de teste para extracao, normalizacao e chunking do pipeline Knowledge Intelligence.',
    );
    const pdfBytes = Buffer.from(pdf);
    const preExtracted = await extractPdf(pdfBytes, {
      filename: 'ki-e2e.pdf',
      mimeType: 'application/pdf',
    });

    const payload = await getPayload({ config });

    const media = await payload.create({
      collection: 'media',
      data: { alt: 'KI E2E PDF' },
      file: {
        data: pdf,
        mimetype: 'application/pdf',
        name: `ki-e2e-${Date.now()}.pdf`,
        size: pdf.length,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const resource = await payload.create({
      collection: 'learning-resources',
      data: {
        title: 'KI E2E Resource',
        media: media.id,
        resourceType: 'pdf',
        origin: 'manual',
        processingStatus: 'pending',
        autoProcess: false,
        language: 'pt-BR',
        version: '1.0.0',
        category: 'test',
        tags: [{ tag: 'ki-e2e' }],
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const result = await processLearningResource({
      payload,
      learningResourceId: resource.id,
      sourceBuffer: pdfBytes,
      sourceMimeType: 'application/pdf',
      sourceFilename: 'ki-e2e.pdf',
      preExtracted,
    });

    assert.equal(result.ok, true);
    assert.ok((result.chunkCount ?? 0) >= 1);
    assert.ok(result.knowledgeDocumentId);

    const updated = await payload.findByID({
      collection: 'learning-resources',
      id: resource.id,
      overrideAccess: true,
    });
    assert.equal(updated.processingStatus, 'completed');
    assert.ok(updated.extractedText);
    assert.ok(updated.normalizedText);
    assert.ok(updated.fileHash);
    assert.ok(updated.knowledgeDocument);

    const chunks = await payload.find({
      collection: 'knowledge-chunks',
      where: { learningResource: { equals: resource.id } },
      limit: 20,
      overrideAccess: true,
    });
    assert.ok(chunks.docs.length >= 1);
    assert.equal(typeof chunks.docs[0]?.chunkText, 'string');
    assert.ok((chunks.docs[0]?.tokenEstimate as number) > 0);

    const queue = await payload.find({
      collection: 'embedding-queue',
      where: {
        and: [
          { learningResource: { equals: resource.id } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 50,
      overrideAccess: true,
    });
    assert.equal(queue.docs.length, chunks.docs.length);
    assert.equal(queue.docs[0]?.provider, 'none');

    const doc = await payload.findByID({
      collection: 'knowledge-documents',
      id: result.knowledgeDocumentId!,
      overrideAccess: true,
    });
    assert.equal(doc.allowAiUse, false);
    assert.equal(doc.publicationStatus, 'unpublished');
    assert.equal(doc.processingStatus, 'queued');
  });

  it('TXT extract path works end-to-end', async () => {
    const payload = await getPayload({ config });
    const body = Buffer.from(
      'Titulo\n\nParagrafo um do teste TXT Knowledge Intelligence.\n\nParagrafo dois com mais conteudo para chunking.\n',
      'utf8',
    );

    const media = await payload.create({
      collection: 'media',
      data: { alt: 'KI E2E TXT' },
      file: {
        data: body,
        mimetype: 'text/plain',
        name: `ki-e2e-${Date.now()}.txt`,
        size: body.length,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const resource = await payload.create({
      collection: 'learning-resources',
      data: {
        title: 'KI E2E TXT',
        media: media.id,
        resourceType: 'txt',
        origin: 'upload',
        processingStatus: 'pending',
        autoProcess: false,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const result = await processLearningResource({
      payload,
      learningResourceId: resource.id,
    });
    assert.equal(result.ok, true);
    assert.ok((result.chunkCount ?? 0) >= 1);
  });
});
