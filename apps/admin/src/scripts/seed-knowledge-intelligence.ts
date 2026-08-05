/**
 * Seed Knowledge Intelligence — cria PDF/TXT frescos e processa o pipeline.
 * Uso: pnpm --filter @omnia/admin seed:knowledge-intelligence
 *
 * Pré-requisito: seed:lms-core (curso fundamentos-refrigeracao-industrial).
 * Não gera embeddings.
 *
 * Nota: extractPdf deve rodar ANTES de getPayload — pdf-parse conflita após boot Payload.
 */
import { extractPdf } from '@omnia/knowledge-intelligence';
import { getPayload } from 'payload';

import config from '../../payload.config';
import { buildKiSeedPdf } from '../services/knowledge-intelligence/fixtures';
import {
  processLearningResource,
  refreshKiDashboard,
} from '../services/knowledge-intelligence/pipeline';

const COURSE_SLUG = 'fundamentos-refrigeracao-industrial';

async function main() {
  const pdf = buildKiSeedPdf();
  const pdfBytes = Buffer.from(pdf);
  const txt = Buffer.from(
    'Omnia Knowledge Intelligence — checklist TXT.\n\nSeguranca, ciclo de compressao e boas praticas.\n',
    'utf8',
  );
  const txtBytes = Buffer.from(txt);

  const pdfExtracted = await extractPdf(pdfBytes, {
    filename: 'ki-seed.pdf',
    mimeType: 'application/pdf',
  });
  console.log('KI_PDF_PRE_EXTRACT', JSON.stringify(pdfExtracted.text).slice(0, 120));

  const payload = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: COURSE_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  if (!courses.docs.length) {
    throw new Error('KI_SEED_REQUIRES_LMS_CORE — rode seed:lms-core antes');
  }
  const course = courses.docs[0]!;

  const modules = await payload.find({
    collection: 'course-modules',
    where: { course: { equals: course.id } },
    limit: 1,
    overrideAccess: true,
  });
  const lessons = await payload.find({
    collection: 'lessons',
    where: { module: { equals: modules.docs[0]?.id } },
    limit: 5,
    overrideAccess: true,
  });
  const pdfLesson =
    lessons.docs.find((l) => (l as { type?: string }).type === 'pdf') ?? lessons.docs[0];

  const pdfMedia = await payload.create({
    collection: 'media',
    data: { alt: 'KI Seed PDF' },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `ki-seed-${Date.now()}.pdf`,
      size: pdf.length,
    },
    overrideAccess: true,
    context: { kiPipelineActive: true },
  });

  const txtMedia = await payload.create({
    collection: 'media',
    data: { alt: 'KI Seed TXT' },
    file: {
      data: txt,
      mimetype: 'text/plain',
      name: `ki-seed-${Date.now()}.txt`,
      size: txt.length,
    },
    overrideAccess: true,
    context: { kiPipelineActive: true },
  });

  const pdfResource = await payload.create({
    collection: 'learning-resources',
    data: {
      title: 'KI Seed — Apostila PDF',
      media: pdfMedia.id,
      lesson: pdfLesson?.id,
      module: modules.docs[0]?.id,
      course: course.id,
      resourceType: 'pdf',
      origin: 'upload',
      processingStatus: 'pending',
      autoProcess: false,
      language: 'pt-BR',
      version: '1.0.0',
      category: 'Refrigeração',
      tags: [{ tag: 'ki-seed' }, { tag: 'pdf' }],
    },
    overrideAccess: true,
    context: { kiPipelineActive: true },
  });

  const txtResource = await payload.create({
    collection: 'learning-resources',
    data: {
      title: 'KI Seed — Checklist TXT',
      media: txtMedia.id,
      course: course.id,
      resourceType: 'txt',
      origin: 'upload',
      processingStatus: 'pending',
      autoProcess: false,
      language: 'pt-BR',
      version: '1.0.0',
      tags: [{ tag: 'ki-seed' }, { tag: 'txt' }],
    },
    overrideAccess: true,
    context: { kiPipelineActive: true },
  });

  const pdfResult = await processLearningResource({
    payload,
    learningResourceId: pdfResource.id,
    sourceBuffer: pdfBytes,
    sourceMimeType: 'application/pdf',
    sourceFilename: 'ki-seed.pdf',
    preExtracted: pdfExtracted,
  });
  const txtResult = await processLearningResource({
    payload,
    learningResourceId: txtResource.id,
    sourceBuffer: txtBytes,
    sourceMimeType: 'text/plain',
    sourceFilename: 'ki-seed.txt',
  });

  // Lesson-assets legados ficam para ingestão via hook Admin (volume media).
  // Seed prova o pipeline com PDF/TXT frescos acima.

  await refreshKiDashboard(payload);

  const completed = await payload.count({
    collection: 'learning-resources',
    where: { processingStatus: { equals: 'completed' } },
    overrideAccess: true,
  });
  const chunks = await payload.count({ collection: 'knowledge-chunks', overrideAccess: true });
  const queue = await payload.count({
    collection: 'embedding-queue',
    where: { status: { equals: 'pending' } },
    overrideAccess: true,
  });

  payload.logger.info({
    msg: 'ki.seed_complete',
    pdfOk: pdfResult.ok,
    txtOk: txtResult.ok,
    pdfChunks: pdfResult.chunkCount,
    txtChunks: txtResult.chunkCount,
    completedResources: completed.totalDocs,
    chunks: chunks.totalDocs,
    queuePending: queue.totalDocs,
  });

  if (!pdfResult.ok || !txtResult.ok) {
    process.exit(2);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
