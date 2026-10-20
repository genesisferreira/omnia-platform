/**
 * Seed LMS Core — 1 curso, 2 módulos, 4 aulas + materiais (PDF/download via Media).
 * Uso: pnpm --filter @omnia/admin seed:lms-core
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPayload } from 'payload';

import config from '../../payload.config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../seed/assets/lms-core');

const COURSE_SLUG = 'fundamentos-refrigeracao-industrial';

/** Minimal valid PDF. */
const MINI_PDF = Buffer.from(
  `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (Omnia LMS Core Seed) Tj ET
endstream
endobj
3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
trailer<< /Size 6 /Root 5 0 R >>
startxref
0
%%EOF`,
  'utf8',
);

const MINI_TXT = Buffer.from('Omnia LMS Core — material de download para homologação.\n', 'utf8');

async function ensureSeedFiles() {
  await mkdir(ASSETS_DIR, { recursive: true });
  const pdfPath = path.join(ASSETS_DIR, 'apostila-fundamentos.pdf');
  const txtPath = path.join(ASSETS_DIR, 'checklist-download.txt');
  await writeFile(pdfPath, MINI_PDF);
  await writeFile(txtPath, MINI_TXT);
  return { pdfPath, txtPath };
}

async function main() {
  const payload = await getPayload({ config });
  await ensureSeedFiles();

  const existing = await payload.find({
    collection: 'courses',
    where: { slug: { equals: COURSE_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs.length) {
    payload.logger.info({ msg: 'lms.core.seed_skip', slug: COURSE_SLUG });
    process.exit(0);
  }

  const pdfMedia = await payload.create({
    collection: 'media',
    data: { alt: 'Apostila Fundamentos de Refrigeração (PDF)' },
    file: {
      data: MINI_PDF,
      mimetype: 'application/pdf',
      name: 'apostila-fundamentos.pdf',
      size: MINI_PDF.length,
    },
    overrideAccess: true,
  });

  const downloadMedia = await payload.create({
    collection: 'media',
    data: { alt: 'Checklist de download LMS Core' },
    file: {
      data: MINI_TXT,
      mimetype: 'text/plain',
      name: 'checklist-download.txt',
      size: MINI_TXT.length,
    },
    overrideAccess: true,
  });

  const course = await payload.create({
    collection: 'courses',
    data: {
      title: 'Fundamentos de Refrigeração Industrial',
      slug: COURSE_SLUG,
      shortDescription: 'Curso introdutório do LMS Core Omnia: ciclos, segurança e boas práticas.',
      category: 'Refrigeração',
      level: 'beginner',
      language: 'pt-BR',
      estimatedHours: 8,
      status: 'published',
      publishedAt: new Date().toISOString(),
      featured: true,
      visibility: 'public',
      tags: [{ tag: 'refrigeracao' }, { tag: 'fundamentos' }],
      seo: {
        metaTitle: 'Fundamentos de Refrigeração Industrial | Omnia',
        metaDescription: 'Catálogo LMS Core — curso publicado para homologação.',
        schemaType: 'Course',
      },
    },
    overrideAccess: true,
  });

  const module1 = await payload.create({
    collection: 'course-modules',
    data: {
      title: 'Introdução e Segurança',
      slug: 'introducao-seguranca',
      description: 'Conceitos iniciais e cuidados em planta.',
      order: 1,
      course: course.id,
      published: true,
    },
    overrideAccess: true,
  });

  const module2 = await payload.create({
    collection: 'course-modules',
    data: {
      title: 'Ciclo de Compressão',
      slug: 'ciclo-compressao',
      description: 'Componentes e operação do ciclo.',
      order: 2,
      course: course.id,
      published: true,
    },
    overrideAccess: true,
  });

  const lessonVideo = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Bem-vindo ao curso (vídeo)',
      slug: 'bem-vindo-video',
      summary: 'Aula de vídeo — URL deve ser definida no authoring (sem fixture de exemplo).',
      type: 'video',
      externalUrl: null,
      duration: 12,
      order: 1,
      published: true,
      module: module1.id,
    },
    overrideAccess: true,
  });

  const lessonText = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Normas e EPIs',
      slug: 'normas-epis',
      summary: 'Texto introdutório sobre segurança.',
      type: 'text',
      duration: 15,
      order: 2,
      published: true,
      module: module1.id,
    },
    overrideAccess: true,
  });

  const lessonPdf = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Apostila do módulo',
      slug: 'apostila-pdf',
      summary: 'Material em PDF anexado.',
      type: 'pdf',
      duration: 30,
      order: 1,
      published: true,
      module: module2.id,
    },
    overrideAccess: true,
  });

  const lessonDownload = await payload.create({
    collection: 'lessons',
    data: {
      title: 'Checklist de partida',
      slug: 'checklist-download',
      summary: 'Arquivo para download.',
      type: 'download',
      duration: 5,
      order: 2,
      published: true,
      module: module2.id,
    },
    overrideAccess: true,
  });

  await payload.create({
    collection: 'lesson-assets',
    data: {
      lesson: lessonPdf.id,
      media: pdfMedia.id,
      assetType: 'pdf',
      title: 'Apostila PDF',
      description: 'Material principal da aula.',
      order: 1,
    },
    overrideAccess: true,
  });

  await payload.create({
    collection: 'lesson-assets',
    data: {
      lesson: lessonDownload.id,
      media: downloadMedia.id,
      assetType: 'attachment',
      title: 'Checklist TXT',
      description: 'Download de homologação.',
      order: 1,
    },
    overrideAccess: true,
  });

  // Video lesson also gets a PDF attachment as secondary material
  await payload.create({
    collection: 'lesson-assets',
    data: {
      lesson: lessonVideo.id,
      media: pdfMedia.id,
      assetType: 'pdf',
      title: 'Roteiro da aula (PDF)',
      order: 1,
    },
    overrideAccess: true,
  });

  payload.logger.info({
    msg: 'lms.core.seed_complete',
    courseId: course.id,
    modules: [module1.id, module2.id],
    lessons: [lessonVideo.id, lessonText.id, lessonPdf.id, lessonDownload.id],
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
