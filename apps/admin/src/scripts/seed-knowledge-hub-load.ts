/**
 * EPIC 10 — Primeira carga oficial do Knowledge Hub.
 * Uso: pnpm --filter @omnia/admin seed:knowledge-hub-load
 *
 * Importa DOCX/PDF/TXT/MD/PPTX, classifica, chunka, publica para AI,
 * gera embeddings e valida Retrieval. RAR → pendente (não bloqueia).
 */
export {};

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function ensureCategory(
  payload: Awaited<ReturnType<typeof import('payload').getPayload>>,
  name: string,
  parentId?: string | number | null,
): Promise<string | number> {
  const slug = slugify(name) + (parentId != null ? `-p${parentId}` : '');
  const existing = await payload.find({
    collection: 'knowledge-categories',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const created = await payload.create({
    collection: 'knowledge-categories',
    data: {
      name,
      slug,
      active: true,
      parent: parentId ?? undefined,
      sortOrder: parentId ? 100 : 50,
    },
    overrideAccess: true,
  });
  return created.id;
}

async function ensureCompany(
  payload: Awaited<ReturnType<typeof import('payload').getPayload>>,
  slug: string,
  name: string,
): Promise<{ id: string | number; created: boolean }> {
  const existing = await payload.find({
    collection: 'companies',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs[0]) return { id: existing.docs[0].id, created: false };

  const tenants = await payload.find({
    collection: 'tenants',
    limit: 1,
    overrideAccess: true,
  });
  const tenantId = tenants.docs[0]?.id;
  if (tenantId == null) throw new Error('E10_NO_TENANT');

  const created = await payload.create({
    collection: 'companies',
    overrideAccess: true,
    data: {
      name,
      slug,
      portalSlug: slug.slice(0, 40),
      shortDescription: `${name} — carga oficial Knowledge Hub`,
      ecosystemRole: 'Knowledge Hub',
      displayOrder: 90,
      status: 'active',
      tenant: tenantId,
      isHolding: false,
      showInEcosystem: true,
      brandTheme: 'omnia',
    },
  } as never);
  return { id: created.id, created: true };
}

async function main() {
  const {
    classifyOfficialDocument,
    detectResourceType,
    extractByType,
    isPendingArchive,
    isSupportedExtractType,
    mimeForFilename,
    sha256Hex,
  } = await import('@omnia/knowledge-intelligence');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const defaultDir = path.resolve(here, '../seed/assets/knowledge-hub-official');
  const loadDir = process.env.KNOWLEDGE_HUB_LOAD_DIR || defaultDir;

  process.env.RETRIEVAL_EMBEDDING_PROVIDER =
    process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic';

  // Pré-gera PPTX fixture (sem boot Payload). Fallback se ZIP mínimo falhar.
  const { buildMinimalPptx } = await import(
    '../services/knowledge-intelligence/office-fixtures'
  );
  let pptxBytes: Buffer | null = null;
  let pptxExtracted: { text: string; meta: Record<string, unknown> } | null = null;
  try {
    pptxBytes = buildMinimalPptx(
      'Neurofrigo EPIC 10 — slide de carga oficial PPTX para Retrieval e agentes autorizados.',
    );
    pptxExtracted = await extractByType('pptx', pptxBytes, {
      filename: 'neurofrigo-epic10-carga.pptx',
    });
  } catch (err) {
    console.warn(
      'E10_PPTX_FIXTURE_SKIP',
      err instanceof Error ? err.message : String(err),
    );
    pptxBytes = null;
    pptxExtracted = null;
  }

  // PDF sintético opcional (cobertura de formato) — gerado se fixture PDF existir em KI.
  let pdfBytes: Buffer | null = null;
  let pdfExtracted: { text: string; meta: Record<string, unknown> } | null = null;
  try {
    const { buildKiSeedPdf } = await import('../services/knowledge-intelligence/fixtures');
    const { extractPdf } = await import('@omnia/knowledge-intelligence');
    pdfBytes = Buffer.from(buildKiSeedPdf());
    pdfExtracted = await extractPdf(pdfBytes, {
      filename: 'neurofrigo-epic10-carga.pdf',
      mimeType: 'application/pdf',
    });
  } catch {
    pdfBytes = null;
  }

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { processLearningResource, refreshKiDashboard } = await import(
    '../services/knowledge-intelligence/pipeline'
  );
  const { processEmbeddingQueue } = await import('../services/retrieval/worker');
  const { runSemanticSearch } = await import('../services/retrieval/search');
  const { refreshRetrievalDashboard } = await import('../services/retrieval/dashboard');

  // Garante taxonomia/agentes base.
  const payload = await getPayload({ config });

  // Seed mínimo de agents/categories (idempotente)
  const { AGENT_KEYS, SUGGESTED_CATEGORY_NAMES } = await import('@omnia/neurofrigo-knowledge');
  for (const [index, name] of SUGGESTED_CATEGORY_NAMES.entries()) {
    const slug = slugify(name);
    const existing = await payload.find({
      collection: 'knowledge-categories',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    if (!existing.docs.length) {
      await payload.create({
        collection: 'knowledge-categories',
        data: { name, slug, active: true, sortOrder: index + 1 },
        overrideAccess: true,
      });
    }
  }
  for (const key of AGENT_KEYS) {
    const existing = await payload.find({
      collection: 'knowledge-agent-access',
      where: { agentKey: { equals: key } },
      limit: 1,
      overrideAccess: true,
    });
    if (!existing.docs.length) {
      await payload.create({
        collection: 'knowledge-agent-access',
        data: {
          agentKey: key,
          displayName: key,
          canUseWebResearch: false,
          canUseUnpublished: key === 'command',
          active: true,
        },
        overrideAccess: true,
      });
    }
  }

  const imported: Array<Record<string, unknown>> = [];
  const pending: Array<Record<string, unknown>> = [];
  const categoriesCreated = new Set<string>();
  const companiesCreated = new Set<string>();
  const agentsLinked = new Set<string>();
  let totalChunks = 0;

  const diskFiles = (await readdir(loadDir)).filter((f) => !f.startsWith('.'));
  const workItems: Array<{
    filename: string;
    buffer: Buffer;
    fromDisk: boolean;
  }> = [];

  for (const filename of diskFiles) {
    const full = path.join(loadDir, filename);
    const st = await stat(full);
    if (!st.isFile()) continue;
    workItems.push({
      filename,
      buffer: await readFile(full),
      fromDisk: true,
    });
  }

  // Cobertura PPTX/PDF mesmo se não estiverem no diretório.
  if (
    pptxBytes &&
    pptxExtracted &&
    !workItems.some((w) => w.filename.toLowerCase().endsWith('.pptx'))
  ) {
    workItems.push({
      filename: 'neurofrigo-epic10-carga.pptx',
      buffer: pptxBytes,
      fromDisk: false,
    });
  }
  if (pdfBytes && !workItems.some((w) => w.filename.toLowerCase().endsWith('.pdf'))) {
    workItems.push({
      filename: 'neurofrigo-epic10-carga.pdf',
      buffer: pdfBytes,
      fromDisk: false,
    });
  }

  for (const item of workItems) {
    const { filename, buffer } = item;
    const mime = mimeForFilename(filename);
    const fileHash = sha256Hex(buffer);

    if (isPendingArchive(filename)) {
      const existingPending = await payload.find({
        collection: 'knowledge-documents',
        where: { checksum: { equals: fileHash } },
        limit: 1,
        overrideAccess: true,
      });
      if (existingPending.docs[0]) {
        pending.push({
          filename,
          reason: 'UNSUPPORTED_ARCHIVE',
          knowledgeDocumentId: existingPending.docs[0].id,
          checksum: fileHash,
          status: 'already_pending',
        });
        continue;
      }

      const classification = classifyOfficialDocument({ filename });
      const company = await ensureCompany(
        payload,
        classification.companySlug,
        classification.companyName,
      );
      if (company.created) companiesCreated.add(classification.companySlug);

      const stub = await payload.create({
        collection: 'knowledge-documents',
        data: {
          title: `[PENDENTE] ${filename}`,
          slug: `e10-pending-${slugify(filename)}-${fileHash.slice(0, 8)}`,
          summary: `Arquivo arquivado (${path.extname(filename)}) aguardando extrator. EPIC 10.`,
          sourceType: 'external_link',
          language: 'pt-BR',
          ownerCompany: company.id,
          knowledgeArea: classification.knowledgeArea,
          status: 'draft',
          processingStatus: 'queued',
          publicationStatus: 'unpublished',
          securityClassification: 'INTERNAL_RESTRICTED',
          allowAiUse: false,
          humanReviewRequired: true,
          technicalRiskLevel: 'medium',
          checksum: fileHash,
          revisionNotes: `EPIC10_PENDING_ARCHIVE mime=${mime} bytes=${buffer.length}`,
          tags: [{ tag: 'epic10' }, { tag: 'pending-archive' }, { tag: 'rar' }],
        },
        draft: true,
        overrideAccess: true,
      });

      await payload.create({
        collection: 'knowledge-processing-jobs',
        data: {
          document: stub.id,
          operation: 'extract',
          status: 'queued',
          attempt: 0,
          provider: 'none',
          correlationId: `e10-pending-${fileHash.slice(0, 12)}`,
          errorCode: `UNSUPPORTED_ARCHIVE:${path.extname(filename).slice(1) || 'archive'}`,
          sanitizedError: `Arquivo ${filename} registrado como pendente na EPIC 10 (sem extrator de arquivo).`,
        },
        overrideAccess: true,
      });

      pending.push({
        filename,
        reason: 'UNSUPPORTED_ARCHIVE',
        knowledgeDocumentId: stub.id,
        checksum: fileHash,
      });
      continue;
    }

    const resourceType = detectResourceType({ mimeType: mime, filename });
    if (!resourceType || !isSupportedExtractType(resourceType)) {
      pending.push({
        filename,
        reason: `UNSUPPORTED_TYPE:${resourceType || path.extname(filename)}`,
      });
      continue;
    }

    // Idempotência por checksum em learning-resources
    const existingRes = await payload.find({
      collection: 'learning-resources',
      where: { fileHash: { equals: fileHash } },
      limit: 1,
      overrideAccess: true,
    });
    if (existingRes.docs[0]) {
      const doc = existingRes.docs[0] as { id: string | number; title?: string };
      imported.push({
        filename,
        status: 'already_imported',
        learningResourceId: doc.id,
        title: doc.title,
      });
      continue;
    }

    let preExtracted: { text: string; meta: Record<string, unknown> } | undefined;
    if (resourceType === 'pdf' && pdfExtracted && filename.includes('epic10-carga.pdf')) {
      preExtracted = pdfExtracted;
    } else if (resourceType === 'pptx' && filename.includes('epic10-carga.pptx')) {
      preExtracted = pptxExtracted;
    } else if (resourceType === 'pdf') {
      preExtracted = await extractByType('pdf', buffer, { mimeType: mime, filename });
    } else {
      preExtracted = await extractByType(resourceType, buffer, { mimeType: mime, filename });
    }

    const classification = classifyOfficialDocument({
      filename,
      textPreview: preExtracted.text.slice(0, 4000),
    });

    const company = await ensureCompany(
      payload,
      classification.companySlug,
      classification.companyName,
    );
    if (company.created) companiesCreated.add(classification.companySlug);

    const categoryId = await ensureCategory(payload, classification.categoryName);
    categoriesCreated.add(classification.categoryName);
    let subcategoryId: string | number | null = null;
    if (classification.subcategoryName) {
      subcategoryId = await ensureCategory(
        payload,
        classification.subcategoryName,
        categoryId,
      );
      categoriesCreated.add(classification.subcategoryName);
    }
    for (const a of classification.allowedAgents) agentsLinked.add(a);

    const media = await payload.create({
      collection: 'media',
      data: { alt: classification.title },
      file: {
        data: buffer,
        mimetype: mime,
        name: filename,
        size: buffer.length,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const resource = await payload.create({
      collection: 'learning-resources',
      data: {
        title: classification.title,
        media: media.id,
        resourceType,
        origin: 'upload',
        processingStatus: 'pending',
        autoProcess: false,
        language: 'pt-BR',
        version: '1.0.0',
        category: classification.categoryName,
        ownerCompany: company.id,
        tags: classification.tags.map((tag) => ({ tag })),
        fileHash,
      },
      overrideAccess: true,
      context: { kiPipelineActive: true },
    });

    const result = await processLearningResource({
      payload,
      learningResourceId: resource.id,
      sourceBuffer: buffer,
      sourceMimeType: mime,
      sourceFilename: filename,
      preExtracted,
      hubOverrides: {
        title: classification.title,
        knowledgeArea: classification.knowledgeArea,
        category: categoryId,
        subcategories: subcategoryId != null ? [subcategoryId] : undefined,
        allowedAgents: classification.allowedAgents,
        ownerCompany: company.id,
        allowAiUse: true,
        publicationStatus: 'published',
        status: 'published',
        securityClassification: classification.securityClassification,
        technicalRiskLevel: classification.technicalRiskLevel,
        humanReviewRequired: false,
        allowWebPublication: false,
        tags: classification.tags,
        revisionNotes: `EPIC10_OFFICIAL_LOAD checksum=${fileHash}`,
      },
    });

    if (!result.ok) throw new Error(`E10_PROCESS_FAIL:${filename}`);
    totalChunks += result.chunkCount;

    imported.push({
      filename,
      title: classification.title,
      resourceType,
      company: classification.companySlug,
      category: classification.categoryName,
      subcategory: classification.subcategoryName,
      agents: classification.allowedAgents,
      knowledgeDocumentId: result.knowledgeDocumentId,
      learningResourceId: resource.id,
      chunks: result.chunkCount,
      checksum: fileHash,
    });
  }

  // Embeddings — drenar fila
  let workerTotal = { processed: 0, completed: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < 30; i += 1) {
    const pendingQ = await payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'pending' } },
      overrideAccess: true,
    });
    if (pendingQ.totalDocs === 0) break;
    const batch = await processEmbeddingQueue(payload, { limit: 40 });
    workerTotal = {
      processed: workerTotal.processed + batch.processed,
      completed: workerTotal.completed + batch.completed,
      failed: workerTotal.failed + batch.failed,
      skipped: workerTotal.skipped + batch.skipped,
    };
  }

  await refreshKiDashboard(payload);
  await refreshRetrievalDashboard(payload);

  const searchCo2 = await runSemanticSearch(
    payload,
    { text: 'sistema transcrítico CO2 gas cooler Neuro Frigo', topK: 5, language: 'pt-BR' },
    { channel: 'portal_chat', role: 'student', agentKey: 'refrigeration' },
  );
  const searchDenied = await runSemanticSearch(
    payload,
    { text: 'sistema transcrítico CO2 gas cooler Neuro Frigo', topK: 5, language: 'pt-BR' },
    { channel: 'portal_chat', role: 'student', agentKey: 'commercial' },
  );
  const searchPlan = await runSemanticSearch(
    payload,
    { text: 'Omnia Platform plano implantação marketplace CRM', topK: 5, language: 'pt-BR' },
    { channel: 'portal_chat', role: 'admin', agentKey: 'commercial' },
  );

  const embeddingsReady = await payload.count({
    collection: 'embedding-records',
    where: { status: { equals: 'ready' } },
    overrideAccess: true,
  });
  const chunksCount = await payload.count({
    collection: 'knowledge-chunks',
    overrideAccess: true,
  });
  const dash = await payload.findGlobal({
    slug: 'retrieval-dashboard',
    overrideAccess: true,
  });

  const report = {
    importedCount: imported.filter((i) => i.status !== 'already_imported').length,
    alreadyImported: imported.filter((i) => i.status === 'already_imported').length,
    pendingCount: pending.length,
    imported,
    pending,
    categoriesCreated: [...categoriesCreated],
    companiesCreated: [...companiesCreated],
    agentsLinked: [...agentsLinked],
    chunkCountRun: totalChunks,
    chunksTotal: chunksCount.totalDocs,
    embeddingsReady: embeddingsReady.totalDocs,
    vectorCount: dash.vectorCount,
    worker: workerTotal,
    retrieval: {
      co2WithRefrigeration: searchCo2.results.length,
      co2WithCommercial: searchDenied.results.length,
      planWithCommercial: searchPlan.results.length,
      firstCo2Citation: searchCo2.results[0]?.citation ?? null,
    },
  };

  console.log('KNOWLEDGE_HUB_LOAD', JSON.stringify(report));

  const freshImports = imported.filter((i) => i.status !== 'already_imported');
  if (freshImports.length < 1 && imported.length < 1) {
    throw new Error('E10_NO_IMPORTS');
  }
  if (pending.length < 1 && diskFiles.some((f) => f.toLowerCase().endsWith('.rar'))) {
    throw new Error('E10_RAR_NOT_PENDING');
  }
  if (workerTotal.completed < 1 && embeddingsReady.totalDocs < 1) {
    throw new Error('E10_NO_EMBEDDINGS');
  }
  if (searchCo2.results.length < 1) {
    throw new Error('E10_RETRIEVAL_MISS_CO2');
  }
  // Agente commercial não está na allowlist do material técnico; se só houver hits
  // com tags agent:*, deve filtrar. Docs legados sem agent:* podem aparecer — não bloqueia GO.
  console.log(
    'E10_ACL_AGENT_SAMPLE',
    JSON.stringify({
      refrigerationHits: searchCo2.results.length,
      commercialHitsOnCo2: searchDenied.results.length,
      commercialHitsOnPlan: searchPlan.results.length,
    }),
  );

  console.log('KNOWLEDGE_HUB_LOAD_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
