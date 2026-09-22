/**
 * Relatório rápido Epic 03 — counts Learning Resources / chunks / fila / dashboard.
 * Uso: pnpm --filter @omnia/admin exec tsx src/scripts/report-knowledge-intelligence.ts
 */
import { getPayload } from 'payload';

import config from '../../payload.config';

async function main() {
  const payload = await getPayload({ config });
  const [lr, done, failed, chunks, queue] = await Promise.all([
    payload.count({ collection: 'learning-resources', overrideAccess: true }),
    payload.count({
      collection: 'learning-resources',
      where: { processingStatus: { equals: 'completed' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'learning-resources',
      where: { processingStatus: { equals: 'failed' } },
      overrideAccess: true,
    }),
    payload.count({ collection: 'knowledge-chunks', overrideAccess: true }),
    payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'pending' } },
      overrideAccess: true,
    }),
  ]);
  const dash = await payload.findGlobal({
    slug: 'ki-intelligence-dashboard',
    overrideAccess: true,
  });

  const report = {
    learningResources: lr.totalDocs,
    completed: done.totalDocs,
    failed: failed.totalDocs,
    chunks: chunks.totalDocs,
    queuePending: queue.totalDocs,
    dashboard: {
      files: dash.filesCount,
      processed: dash.processedCount,
      pending: dash.pendingCount,
      failed: dash.failedCount,
      chunks: dash.chunksCount,
      queue: dash.queuePendingCount,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.totalDocs > 0 && done.totalDocs === 0 ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
