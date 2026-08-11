import type { Payload, PayloadRequest } from 'payload';

export type KnowledgeAuditInput = {
  action: string;
  entityType: string;
  entityId?: string | number | null;
  previousState?: unknown;
  nextState?: unknown;
  reason?: string | null;
  correlationId?: string | null;
  actorId?: string | number | null;
  environment?: string | null;
};

/**
 * Sanitiza estado para auditoria — nunca persiste content/richText/tokens/secrets.
 */
export function sanitizeKnowledgeAuditState(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeKnowledgeAuditState(item));
  }

  const blocked = new Set([
    'content',
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'checksum',
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (blocked.has(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (key === 'file' || key === 'summary') {
      out[key] = val == null ? null : '[omitted]';
      continue;
    }
    out[key] = sanitizeKnowledgeAuditState(val);
  }
  return out;
}

/**
 * Grava evento imutável em knowledge-audit-events (overrideAccess).
 * Falhas são logadas; não interrompem o fluxo editorial.
 */
export async function writeKnowledgeAudit(
  payload: Payload,
  input: KnowledgeAuditInput,
  req?: PayloadRequest,
): Promise<void> {
  try {
    const actorId =
      input.actorId != null
        ? String(input.actorId)
        : req?.user?.id != null
          ? String(req.user.id)
          : 'system';

    await payload.create({
      collection: 'knowledge-audit-events',
      data: {
        actor: actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId != null ? String(input.entityId) : null,
        previousState: sanitizeKnowledgeAuditState(input.previousState),
        nextState: sanitizeKnowledgeAuditState(input.nextState),
        reason: input.reason ?? null,
        correlationId: input.correlationId ?? null,
        environment:
          input.environment ?? process.env.OMNIA_ENV ?? process.env.NODE_ENV ?? 'development',
        eventAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    });
  } catch (err) {
    payload.logger.warn({
      msg: 'knowledge.audit_failed',
      action: input.action,
      entityType: input.entityType,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}
