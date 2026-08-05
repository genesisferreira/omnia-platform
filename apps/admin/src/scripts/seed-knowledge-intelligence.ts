/**
 * Seed Knowledge Intelligence — processa materiais LMS Core (PDF/TXT) no pipeline.
 * Uso: pnpm --filter @omnia/admin seed:knowledge-intelligence
 *
 * Pré-requisito: seed:lms-core (curso fundamentos-refrigeracao-industrial).
 * Não gera embeddings.
 */
import { getPayload } from 'payload';

import config from '../../payload.config';
import { buildKiSeedPdf } from '../services/knowledge-intelligence/fixtures';
import {
  ensureLearningResourceFromLessonAsset,
  refreshKiDashboard,
} from '../services/knowledge-intelligence/pipeline';

const COURSE_SLUG = 'fundamentos-refrigeracao-industrial';

async function main() {
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

  // Atualiza o PDF do LMS seed com texto extraível (se existir apostila)
  const pdfMedia = await payload.find({
    collection: 'media',
    where: { filename: { equals: 'apostila-fundamentos.pdf' } },
    limit: 1,
    overrideAccess: true,
  });

  if (pdfMedia.docs[0]) {
    const betterPdf = buildKiSeedPdf(
      'Omnia Knowledge Intelligence — Apostila Fundamentos de Refrigeracao Industrial. Ciclo de compressao, seguranca e boas praticas.',
    );
    await payload.update({
      collection: 'media',
      id: pdfMedia.docs[0].id,
      data: { alt: 'Apostila Fundamentos de Refrigeração (PDF KI)' },
      file: {
        data: betterPdf,
        mimetype: 'application/pdf',
        name: 'apostila-fundamentos.pdf',
        size: betterPdf.length,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });
  }

  const assets = await payload.find({
    collection: 'lesson-assets',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  let processed = 0;
  let skipped = 0;
  for (const asset of assets.docs) {
    const result = await ensureLearningResourceFromLessonAsset({
      payload,
      lessonAssetId: asset.id,
      process: true,
    });
    if (result.processed) processed += 1;
    else if (result.learningResourceId == null) skipped += 1;
  }

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
    assets: assets.docs.length,
    processed,
    skipped,
    completedResources: completed.totalDocs,
    chunks: chunks.totalDocs,
    queuePending: queue.totalDocs,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
