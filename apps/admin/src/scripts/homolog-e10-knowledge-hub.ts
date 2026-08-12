/**
 * Homologação EPIC 10 — retrieval real + smoke Runtime/Chat.
 * Não altera prompts/Runtime; só consome documentos já indexados.
 *
 * Uso: pnpm --filter @omnia/admin exec tsx src/scripts/homolog-e10-knowledge-hub.ts
 */
export {};

async function main() {
  process.env.RETRIEVAL_EMBEDDING_PROVIDER =
    process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runSemanticSearch } = await import('../services/retrieval/search');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');

  const payload = await getPayload({ config });

  const queries = [
    {
      id: 'q1_co2_ia',
      text: 'Como a inteligência artificial pode ser aplicada ao controle de refrigeração com CO2?',
      agentKey: 'refrigeration',
    },
    {
      id: 'q2_controle_transcritico',
      text: 'Qual o papel do sistema de controle no CO2 transcrítico?',
      agentKey: 'neurofrigo-technology',
    },
    {
      id: 'q3_implantacao_omnia',
      text: 'Quais são as etapas da implantação da plataforma Omnia?',
      agentKey: 'commercial',
    },
  ] as const;

  const retrieval: Array<Record<string, unknown>> = [];
  for (const q of queries) {
    const result = await runSemanticSearch(
      payload,
      { text: q.text, topK: 5, language: 'pt-BR' },
      { channel: 'portal_chat', role: 'student', agentKey: q.agentKey },
    );
    retrieval.push({
      id: q.id,
      query: q.text,
      agentKey: q.agentKey,
      hitCount: result.results.length,
      tookMs: result.tookMs,
      first: result.results[0]
        ? {
            score: result.results[0].score,
            similarity: result.results[0].similarity,
            chunkId: result.results[0].chunkId,
            citation: result.results[0].citation,
            textPreview: String(result.results[0].text || '').slice(0, 180),
          }
        : null,
      status: result.results.length > 0 ? 'hits' : 'not_found',
    });
  }

  const published = await payload.find({
    collection: 'knowledge-documents',
    where: {
      and: [
        { publicationStatus: { equals: 'published' } },
        { allowAiUse: { equals: true } },
        { revisionNotes: { contains: 'EPIC10_OFFICIAL_LOAD' } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const pendingRar = await payload.find({
    collection: 'knowledge-documents',
    where: {
      or: [
        { revisionNotes: { contains: 'EPIC10_PENDING_ARCHIVE' } },
        { title: { contains: '[PENDENTE]' } },
      ],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  const jobsQueued = await payload.count({
    collection: 'knowledge-processing-jobs',
    where: {
      and: [{ status: { equals: 'queued' } }, { operation: { equals: 'extract' } }],
    },
    overrideAccess: true,
  });

  const chunks = await payload.count({ collection: 'knowledge-chunks', overrideAccess: true });
  const embeddingsReady = await payload.count({
    collection: 'embedding-records',
    where: { status: { equals: 'ready' } },
    overrideAccess: true,
  });
  const queuePending = await payload.count({
    collection: 'embedding-queue',
    where: { status: { equals: 'pending' } },
    overrideAccess: true,
  });
  const queueFailed = await payload.count({
    collection: 'embedding-queue',
    where: { status: { equals: 'failed' } },
    overrideAccess: true,
  });
  const queueCompleted = await payload.count({
    collection: 'embedding-queue',
    where: { status: { equals: 'completed' } },
    overrideAccess: true,
  });

  const dash = await payload.findGlobal({
    slug: 'retrieval-dashboard',
    overrideAccess: true,
  });

  // Runtime/Chat smoke — perguntas grounded nos docs oficiais
  const course = (
    await payload.find({
      collection: 'courses',
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0];
  if (!course) throw new Error('E10_HOMOLOG_REQUIRES_COURSE');

  const askCo2 = await runNeurofrigoAsk(payload, {
    question:
      'Com base no material Neuro Frigo, como a IA se relaciona ao controle de sistemas transcríticos de CO2?',
    assistantId: 'auto',
    identity: { userId: 'e10-homolog', role: 'student', language: 'pt-BR' },
    course: {
      courseId: String(course.id),
      courseTitle: String((course as { title?: string }).title || ''),
    },
  });

  const askOmnia = await runNeurofrigoAsk(payload, {
    question:
      'Quais etapas e módulos principais aparecem no plano de implantação da Omnia Platform Fase 1?',
    assistantId: 'auto',
    identity: { userId: 'e10-homolog', role: 'admin', language: 'pt-BR' },
    course: {
      courseId: String(course.id),
      courseTitle: String((course as { title?: string }).title || ''),
    },
  });

  const report = {
    publishedEpic10: published.docs.map((d) => ({
      id: d.id,
      title: (d as { title?: string }).title,
      status: (d as { status?: string }).status,
      publicationStatus: (d as { publicationStatus?: string }).publicationStatus,
      allowAiUse: (d as { allowAiUse?: boolean }).allowAiUse,
    })),
    pendingArchives: pendingRar.docs.map((d) => ({
      id: d.id,
      title: (d as { title?: string }).title,
      status: (d as { status?: string }).status,
      publicationStatus: (d as { publicationStatus?: string }).publicationStatus,
      allowAiUse: (d as { allowAiUse?: boolean }).allowAiUse,
    })),
    extractJobsQueued: jobsQueued.totalDocs,
    chunks: chunks.totalDocs,
    embeddingsReady: embeddingsReady.totalDocs,
    queue: {
      pending: queuePending.totalDocs,
      failed: queueFailed.totalDocs,
      completed: queueCompleted.totalDocs,
    },
    vectorCount: dash.vectorCount,
    retrieval,
    chat: {
      co2: {
        status: askCo2.answer.status,
        assistantKey: askCo2.assistantKey,
        specialistLabel: askCo2.specialistLabel,
        providerUsed: askCo2.providerMeta?.providerUsed,
        sourceCount: askCo2.answer.sources?.length ?? 0,
        sourcesPreview: (askCo2.answer.sources || []).slice(0, 3),
        textPreview: String(askCo2.answer.formattedText || askCo2.answer.text || '').slice(0, 240),
        errorCode: askCo2.answer.errorCode ?? null,
      },
      omnia: {
        status: askOmnia.answer.status,
        assistantKey: askOmnia.assistantKey,
        specialistLabel: askOmnia.specialistLabel,
        providerUsed: askOmnia.providerMeta?.providerUsed,
        sourceCount: askOmnia.answer.sources?.length ?? 0,
        sourcesPreview: (askOmnia.answer.sources || []).slice(0, 3),
        textPreview: String(askOmnia.answer.formattedText || askOmnia.answer.text || '').slice(
          0,
          240,
        ),
        errorCode: askOmnia.answer.errorCode ?? null,
      },
    },
  };

  console.log('E10_HOMOLOG', JSON.stringify(report));

  if (published.docs.length < 1) throw new Error('E10_NO_PUBLISHED_EPIC10_DOCS');
  if (pendingRar.docs.length < 1) throw new Error('E10_RAR_PENDING_MISSING');
  if (chunks.totalDocs < 1) throw new Error('E10_NO_CHUNKS');
  if (embeddingsReady.totalDocs < 1) throw new Error('E10_NO_EMBEDDINGS');

  const technicalHits = retrieval.filter((r) =>
    ['q1_co2_ia', 'q2_controle_transcritico'].includes(String(r.id)),
  );
  if (technicalHits.every((r) => Number(r.hitCount) < 1)) {
    throw new Error('E10_RETRIEVAL_NO_TECH_HITS');
  }

  if (askCo2.answer.status === 'error' && askOmnia.answer.status === 'error') {
    throw new Error(
      `E10_CHAT_BOTH_FAILED co2=${askCo2.answer.errorCode} omnia=${askOmnia.answer.errorCode}`,
    );
  }

  console.log('E10_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
