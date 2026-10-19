import type { Access, CollectionConfig, CollectionSlug, PayloadRequest } from 'payload';

import { getPartnerIdsWithCapability } from '../../access/marketplace';
import { getRelationId, hasStaffAccess } from '../../access/rbac';
import { GROUP } from './fields';

export const MARKETPLACE_AUDIT_EVENT_TYPES = [
  'invitation_created',
  'invitation_revoked',
  'invitation_accepted',
  'membership_role_changed',
  'membership_status_changed',
  'listing_revision_submitted',
  'listing_revision_approved',
  'listing_revision_rejected',
] as const;
export type MarketplaceAuditEventType = (typeof MARKETPLACE_AUDIT_EVENT_TYPES)[number];

/** Staff lê tudo; quem gerencia a empresa lê os eventos dela. */
const auditRead: Access = async ({ req: { user, payload } }) => {
  if (!user) return false;
  if (hasStaffAccess(user)) return true;
  const ids = await getPartnerIdsWithCapability(payload, user.id, 'manage');
  return ids.length > 0 ? { partner: { in: ids } } : false;
};

/** Trilha de auditoria append-only do Marketplace (acesso de equipe e moderação de revisões). */
export const MarketplaceAuditEvents: CollectionConfig = {
  slug: 'marketplace-audit-events',
  labels: { singular: 'Evento de auditoria', plural: 'Auditoria do Marketplace' },
  admin: {
    useAsTitle: 'type',
    group: GROUP,
    defaultColumns: ['type', 'partner', 'actor', 'targetCollection', 'targetId', 'createdAt'],
    description: 'Registro imutável de convites, papéis, revogações e moderação de revisões.',
  },
  timestamps: true,
  access: {
    read: auditRead,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: MARKETPLACE_AUDIT_EVENT_TYPES.map((value) => ({ label: value, value })),
    },
    { name: 'partner', type: 'relationship', relationTo: 'partners', index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users', index: true },
    { name: 'subjectUser', type: 'relationship', relationTo: 'users', label: 'Usuário afetado' },
    { name: 'targetCollection', type: 'text', index: true },
    { name: 'targetId', type: 'text', index: true },
    { name: 'data', type: 'json', label: 'Detalhes / diferenças' },
  ],
};

const AUDIT = 'marketplace-audit-events' as CollectionSlug;

/** Grava um evento de auditoria na mesma transação da operação de origem. */
export async function recordMarketplaceAudit(
  req: PayloadRequest,
  event: {
    type: MarketplaceAuditEventType;
    partner?: unknown;
    subjectUser?: unknown;
    targetCollection: string;
    targetId: unknown;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  const pendingFile = req.file;
  req.file = undefined;
  try {
    await req.payload.create({
      collection: AUDIT,
      data: {
        type: event.type,
        partner: getRelationId(event.partner) ?? undefined,
        actor: req.user?.id ?? undefined,
        subjectUser: getRelationId(event.subjectUser) ?? undefined,
        targetCollection: event.targetCollection,
        targetId: event.targetId == null ? undefined : String(event.targetId),
        data: event.data ?? undefined,
      } as never,
      overrideAccess: true,
      req,
    });
  } finally {
    req.file = pendingFile;
  }
}
