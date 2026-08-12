/**
 * EPIC 16 R3 — Official PUBLIC institutional knowledge for Concierge.
 *
 * Idempotent: reuses learning-resource by title marker.
 * Does NOT modify STUDENT / TEACHER_MANAGER / INTERNAL docs.
 *
 * Usage (staging only):
 *   OMNIA_ALLOW_E2E_SEED=1 NODE_ENV=production \
 *   pnpm --filter @omnia/admin seed:epic16-public-knowledge
 */
export {};

const MARKER = 'EPIC16_PUBLIC_INSTITUTIONAL_V1';
const RESOURCE_TITLE = `${MARKER} — Omnia Frigo Holding (público)`;

function assertStagingSafe() {
  const env = String(process.env.OMNIA_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production' && process.env.OMNIA_ALLOW_PROD_SEED !== '1') {
    throw new Error('ABORT: refused in production');
  }
  if (process.env.OMNIA_ALLOW_E2E_SEED !== '1') {
    throw new Error('ABORT: set OMNIA_ALLOW_E2E_SEED=1');
  }
}

function buildPublicCorpus(): string {
  return `
${MARKER}

# Omnia Frigo Holding

A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une
tradição, educação e inteligência artificial aplicada. Seu propósito é conectar
holding, serviços, tecnologia, formação profissional e engenharia em uma
plataforma digital orientada a conhecimento técnico real.

## Propósito e visão

A Omnia Frigo Holding transforma a refrigeração brasileira pela união entre
conhecimento técnico, formação de profissionais, execução de projetos e
tecnologia inteligente orientada por dados. A visão é ser referência na América
Latina em educação, engenharia e inteligência artificial aplicadas à refrigeração,
climatização e utilidades industriais.

## Empresas do ecossistema Omnia Frigo

As empresas que fazem parte da Omnia Frigo Holding incluem:

1. Renovação Refrigeração — engenharia, projetos, instalação, manutenção e
   soluções técnicas para refrigeração industrial e comercial.
2. Fred do Frio — educação moderna e especialização profissional em refrigeração.
3. CTE — base histórica de formação técnica, normativa e industrial do grupo.
4. Neurofrigo Command IA — tecnologia, automação, dados e inteligência artificial
   aplicada à refrigeração.
5. Neurofrigo Carga — produto digital do ecossistema para gestão de carga refrigerada.

## Serviços da Renovação Refrigeração

A Renovação Refrigeração oferece serviços de engenharia e projetos em refrigeração,
incluindo levantamento técnico, projeto de câmaras e sistemas, instalação,
comissionamento, manutenção preventiva e corretiva, e suporte a operações de
refrigeração industrial e comercial. Para um projeto de refrigeração industrial,
a empresa do ecossistema a procurar é a Renovação Refrigeração.

## Cursos e treinamentos

Os cursos e treinamentos do ecossistema Omnia são oferecidos principalmente pelo
Fred do Frio e pelo CTE, com apoio de conteúdos digitais da plataforma Omnia.
Há formação em fundamentos de refrigeração industrial, práticas de segurança,
sistemas com CO2, comando elétrico e temas correlatos de HVAC-R. Quem deseja
fazer um curso de refrigeração deve procurar o Fred do Frio (educação moderna)
ou o CTE (formação técnica e normativa), conforme o objetivo de aprendizagem.

## Neurofrigo Command IA e produtos

O Neurofrigo Command IA é o braço de tecnologia da holding para monitoramento,
automação e inteligência artificial aplicada ao controle de refrigeração.
Produtos e serviços integrados incluem orientação institucional, catálogo de
cursos, serviços de engenharia da Renovação e soluções digitais Neurofrigo.

## Ofertas integradas e orientação ao visitante

Visitantes podem:
- Conhecer cursos e treinamentos (Fred do Frio / CTE)
- Conhecer serviços de engenharia e projetos (Renovação Refrigeração)
- Conhecer o Neurofrigo e IA aplicada (Neurofrigo Command IA)
- Encontrar a empresa certa do ecossistema conforme a necessidade
- Obter informações institucionais sobre a Omnia Frigo Holding

Para engenharia e projetos de refrigeração industrial: Renovação Refrigeração.
Para educação e cursos: Fred do Frio ou CTE.
Para tecnologia e IA aplicada: Neurofrigo Command IA.

Este conteúdo é institucional, público e autorizado para o Concierge do Portal.
`.trim();
}

async function main() {
  assertStagingSafe();

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { processLearningResource, refreshKiDashboard } =
    await import('../services/knowledge-intelligence/pipeline');
  const { processEmbeddingQueue } = await import('../services/retrieval/worker');
  const { refreshRetrievalDashboard } = await import('../services/retrieval/dashboard');
  const { runSemanticSearch } = await import('../services/retrieval/search');

  const payload = await getPayload({ config });
  const corpus = buildPublicCorpus();
  const buffer = Buffer.from(corpus, 'utf8');

  const companies = await payload.find({
    collection: 'companies',
    limit: 50,
    overrideAccess: true,
  });
  const holding =
    companies.docs.find(
      (c) => String((c as { slug?: string }).slug || '') === 'omnia-frigo-holding',
    ) ||
    companies.docs.find((c) =>
      /omnia|holding|frigo/i.test(String((c as { name?: string }).name || '')),
    );
  const holdingId = holding?.id ?? null;

  const existing = await payload.find({
    collection: 'learning-resources',
    where: { title: { equals: RESOURCE_TITLE } },
    limit: 1,
    overrideAccess: true,
  });

  let resourceId = existing.docs[0]?.id as string | number | undefined;
  let knowledgeDocumentId: string | number | null =
    (
      existing.docs[0] as
        { knowledgeDocument?: string | number | { id: string | number } } | undefined
    )?.knowledgeDocument != null
      ? typeof (existing.docs[0] as { knowledgeDocument?: unknown }).knowledgeDocument === 'object'
        ? (existing.docs[0] as { knowledgeDocument: { id: string | number } }).knowledgeDocument.id
        : (existing.docs[0] as { knowledgeDocument: string | number }).knowledgeDocument
      : null;

  const existingPublic =
    knowledgeDocumentId != null
      ? await payload
          .findByID({
            collection: 'knowledge-documents',
            id: knowledgeDocumentId,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null)
      : null;

  const alreadyReady =
    existingPublic &&
    (existingPublic as { securityClassification?: string }).securityClassification === 'PUBLIC' &&
    (existingPublic as { allowAiUse?: boolean }).allowAiUse === true &&
    (existingPublic as { publicationStatus?: string }).publicationStatus === 'published';

  let chunkCount = 0;

  if (!alreadyReady) {
    if (resourceId == null) {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'EPIC16 PUBLIC institutional Omnia' },
        file: {
          data: buffer,
          mimetype: 'text/plain',
          name: `epic16-public-omnia-${Date.now()}.txt`,
          size: buffer.length,
        },
        overrideAccess: true,
        context: { kiPipelineActive: true },
      });

      const resource = await payload.create({
        collection: 'learning-resources',
        data: {
          title: RESOURCE_TITLE,
          media: media.id,
          resourceType: 'txt',
          origin: 'upload',
          processingStatus: 'pending',
          autoProcess: false,
          language: 'pt-BR',
          version: '1.0.0',
          category: 'Institucional',
          ...(holdingId != null ? { ownerCompany: holdingId } : {}),
          tags: [
            { tag: 'epic16-public' },
            { tag: 'institucional' },
            { tag: 'concierge' },
            { tag: MARKER.toLowerCase() },
          ],
        },
        overrideAccess: true,
        context: { kiPipelineActive: true },
      });
      resourceId = resource.id;
    } else {
      // Clear previous chunks/queue for clean re-ingest (idempotent upgrade).
      const oldChunks = await payload.find({
        collection: 'knowledge-chunks',
        where: { learningResource: { equals: resourceId } },
        limit: 500,
        overrideAccess: true,
      });
      for (const chunk of oldChunks.docs) {
        const q = await payload.find({
          collection: 'embedding-queue',
          where: { chunk: { equals: chunk.id } },
          limit: 20,
          overrideAccess: true,
        });
        for (const item of q.docs) {
          await payload.delete({
            collection: 'embedding-queue',
            id: item.id,
            overrideAccess: true,
          });
        }
        await payload.delete({
          collection: 'knowledge-chunks',
          id: chunk.id,
          overrideAccess: true,
        });
      }
      try {
        const { getVectorStore } = await import('../services/retrieval/runtime');
        const store = await getVectorStore();
        await store.deleteResource(String(resourceId));
      } catch {
        /* best-effort vector cleanup */
      }
    }

    const result = await processLearningResource({
      payload,
      learningResourceId: resourceId!,
      sourceBuffer: buffer,
      sourceMimeType: 'text/plain',
      sourceFilename: 'epic16-public-omnia.txt',
      hubOverrides: {
        title: 'Omnia Frigo Holding — Guia institucional público',
        knowledgeArea: 'institucional',
        allowedAgents: ['concierge', 'support'],
        allowAiUse: true,
        publicationStatus: 'published',
        securityClassification: 'PUBLIC',
        technicalRiskLevel: 'low',
        humanReviewRequired: false,
        allowWebPublication: true,
        tags: ['epic16-public', 'institucional', 'omnia-frigo', MARKER.toLowerCase()],
        revisionNotes: `${MARKER} public concierge pack`,
        ...(holdingId != null ? { ownerCompany: holdingId } : {}),
      },
    });

    if (!result.ok) {
      throw new Error(`PUBLIC_PROCESS_FAIL:${JSON.stringify(result)}`);
    }
    knowledgeDocumentId = result.knowledgeDocumentId;
    chunkCount = result.chunkCount;
  } else {
    const counted = await payload.count({
      collection: 'knowledge-chunks',
      where: { learningResource: { equals: resourceId } },
      overrideAccess: true,
    });
    chunkCount = counted.totalDocs;
  }

  let worker = { processed: 0, completed: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < 40; i += 1) {
    const pendingQ = await payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'pending' } },
      overrideAccess: true,
    });
    if (pendingQ.totalDocs === 0) break;
    const batch = await processEmbeddingQueue(payload, { limit: 50 });
    worker = {
      processed: worker.processed + batch.processed,
      completed: worker.completed + batch.completed,
      failed: worker.failed + batch.failed,
      skipped: worker.skipped + batch.skipped,
    };
  }

  await refreshKiDashboard(payload).catch(() => undefined);
  await refreshRetrievalDashboard(payload).catch(() => undefined);

  const probes = [
    'O que é a Omnia Frigo?',
    'Quais empresas fazem parte da Omnia Frigo?',
    'Quais serviços a Renovação oferece?',
    'Quais cursos vocês oferecem?',
    'Qual empresa devo procurar para um projeto de refrigeração industrial?',
  ];

  const probeResults: Array<{ q: string; hits: number; afterAcl: number }> = [];
  for (const q of probes) {
    const search = await runSemanticSearch(
      payload,
      { text: q, topK: 5, language: 'pt-BR' },
      { channel: 'portal_public', role: 'anonymous', agentKey: 'concierge' },
    );
    probeResults.push({
      q,
      hits: search.results.length,
      afterAcl: search.afterAclCount,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        marker: MARKER,
        alreadyReady: Boolean(alreadyReady),
        learningResourceId: resourceId,
        knowledgeDocumentId,
        chunkCount,
        worker,
        probes: probeResults,
      },
      null,
      2,
    ),
  );

  const failed = probeResults.filter((p) => p.hits < 1 || p.afterAcl < 1);
  if (failed.length) {
    console.error('PUBLIC_RETRIEVAL_PROBES_FAILED', failed);
    process.exitCode = 2;
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
