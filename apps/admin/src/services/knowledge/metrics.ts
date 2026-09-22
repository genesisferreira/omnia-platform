/**
 * Contadores Prometheus tipados (labels de baixa cardinalidade).
 * Sem PII / sem IDs de documento.
 */
export const KNOWLEDGE_METRIC_NAMES = [
  'knowledge_documents_total',
  'knowledge_documents_by_status',
  'knowledge_reviews_pending',
  'knowledge_processing_jobs_total',
  'knowledge_processing_failures_total',
  'knowledge_publications_total',
  'knowledge_acl_denials_total',
] as const;

export type KnowledgeMetricName = (typeof KNOWLEDGE_METRIC_NAMES)[number];

/** Placeholder — integração com @omnia/monitoring na Macroentrega 02. */
export function recordKnowledgeMetric(
  name: KnowledgeMetricName,
  labels: Record<string, string> = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  // Evita alta cardinalidade: apenas status/classificação/operation.
  const safe = Object.fromEntries(
    Object.entries(labels).filter(([k]) =>
      ['status', 'classification', 'operation', 'code'].includes(k),
    ),
  );
  // eslint-disable-next-line no-console
  console.debug('[knowledge.metric]', name, safe);
}
