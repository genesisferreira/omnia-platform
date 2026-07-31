import type { Payload, PayloadRequest } from 'payload';

import type { LmsIdentityLink, LmsNotLinked } from '@omnia/shared/lms';

export async function findIdentityLink(
  payload: Payload,
  omniaUserId: string,
): Promise<LmsIdentityLink | null> {
  const result = await payload.find({
    collection: 'lms-identity-links',
    where: {
      and: [
        { omniaUserId: { equals: omniaUserId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0];
  if (!doc) return null;

  return {
    omniaUserId: String(doc.omniaUserId),
    moodleUserId: Number(doc.moodleUserId),
    moodleUsername: typeof doc.moodleUsername === 'string' ? doc.moodleUsername : null,
    status: (doc.status as LmsIdentityLink['status']) || 'active',
    linkedAt:
      doc.linkedAt != null
        ? new Date(doc.linkedAt as string | Date).toISOString()
        : null,
    lastSyncedAt:
      doc.lastSyncedAt != null
        ? new Date(doc.lastSyncedAt as string | Date).toISOString()
        : null,
    syncStatus: (doc.syncStatus as LmsIdentityLink['syncStatus']) || 'never',
  };
}

export function notLinkedBody(): LmsNotLinked {
  return { connected: false, reason: 'MOODLE_IDENTITY_NOT_LINKED' };
}

export async function writeLmsAudit(
  req: PayloadRequest,
  input: {
    action: string;
    actorId: string;
    targetUserId?: string;
    previousValue?: unknown;
    newValue?: unknown;
    reason?: string | null;
    metadata?: unknown;
  },
): Promise<void> {
  try {
    await req.payload.create({
      collection: 'lms-audit-events',
      data: {
        action: input.action,
        actorId: input.actorId,
        targetUserId: input.targetUserId ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? null,
      },
      overrideAccess: true,
      req,
    });
  } catch {
    req.payload.logger.warn({ msg: 'lms.audit.write_failed', action: input.action });
  }
}
