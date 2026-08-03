import type { CollectionConfig } from 'payload';

import {
  knowledgeAuditCreateAccess,
  knowledgeAuditImmutable,
  knowledgeAuditReadAccess,
} from '../../access/knowledge';

/**
 * Auditoria imutável do Knowledge Hub.
 * Create apenas via sistema (writeKnowledgeAudit + overrideAccess).
 */
export const KnowledgeAuditEvents: CollectionConfig = {
  slug: 'knowledge-audit-events',
  labels: {
    singular: 'Evento de Auditoria',
    plural: 'Auditoria',
  },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'entityType', 'entityId', 'actor', 'eventAt', 'createdAt'],
    group: 'Neurofrigo AI',
    description: 'Registro imutável. Sem conteúdo completo, tokens ou secrets.',
  },
  timestamps: true,
  access: {
    read: knowledgeAuditReadAccess,
    create: knowledgeAuditCreateAccess,
    update: knowledgeAuditImmutable,
    delete: knowledgeAuditImmutable,
  },
  fields: [
    {
      name: 'actor',
      type: 'text',
      required: true,
      index: true,
      label: 'Ator',
    },
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
      label: 'Ação',
    },
    {
      name: 'entityType',
      type: 'text',
      required: true,
      index: true,
      label: 'Tipo de entidade',
    },
    {
      name: 'entityId',
      type: 'text',
      index: true,
      label: 'ID da entidade',
    },
    {
      name: 'previousState',
      type: 'json',
      label: 'Estado anterior (sanitizado)',
    },
    {
      name: 'nextState',
      type: 'json',
      label: 'Próximo estado (sanitizado)',
    },
    {
      name: 'reason',
      type: 'textarea',
      label: 'Motivo',
    },
    {
      name: 'correlationId',
      type: 'text',
      index: true,
      label: 'Correlation ID',
    },
    {
      name: 'environment',
      type: 'text',
      label: 'Ambiente',
    },
    {
      name: 'eventAt',
      type: 'date',
      label: 'Timestamp do evento',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      index: true,
    },
  ],
};
