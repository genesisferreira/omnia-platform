import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

export const LEAD_STATUSES = [
  'novo',
  'contato',
  'qualificado',
  'diagnostico',
  'proposta',
  'negociacao',
  'fechado',
  'perdido',
] as const;

export const LEAD_TEMPERATURES = ['frio', 'morno', 'quente'] as const;

const logLeadActivity: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  // Evita Activity duplicada quando o endpoint de captação já registrou lead_captured.
  if (context?.skipLeadActivityLog === true) {
    return doc;
  }

  const payload = req.payload;
  const authorId = req.user?.id ?? null;

  try {
    if (operation === 'create') {
      const isLanding = doc.origin === 'landing_page';
      const interest =
        typeof doc.interest === 'string' && doc.interest.trim() ? doc.interest.trim() : 'n/d';
      await payload.create({
        collection: 'activities',
        data: {
          type: (isLanding ? 'lead_captured' : 'create') as
            'create' | 'update' | 'status_change' | 'comment',
          message: isLanding
            ? `Lead capturado via landing_page · interesse=${interest} · actor=system/public-form`
            : `Lead criado: ${doc.id}`,
          relatedTo: { relationTo: 'leads', value: doc.id },
          author: authorId,
        },
        overrideAccess: true,
        req,
      });
      return doc;
    }

    const prevStatus = previousDoc?.status;
    const nextStatus = doc.status;
    if (prevStatus && nextStatus && prevStatus !== nextStatus) {
      await payload.create({
        collection: 'activities',
        data: {
          type: 'status_change',
          message: `Status: ${prevStatus} → ${nextStatus}`,
          relatedTo: { relationTo: 'leads', value: doc.id },
          author: authorId,
        },
        overrideAccess: true,
        req,
      });
    } else {
      await payload.create({
        collection: 'activities',
        data: {
          type: 'update',
          message: `Lead atualizado: ${doc.id}`,
          relatedTo: { relationTo: 'leads', value: doc.id },
          author: authorId,
        },
        overrideAccess: true,
        req,
      });
    }
  } catch {
    // Não bloquear a operação CRM por falha de auditoria.
  }

  return doc;
};

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: 'Lead',
    plural: 'Leads',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'temperature', 'owner', 'estimatedValue', 'updatedAt'],
    group: 'CRM',
  },
  timestamps: true,
  access: {
    read: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: adminsOnly,
  },
  hooks: {
    afterChange: [logLeadActivity],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'companyName',
      type: 'text',
      label: 'Empresa (texto)',
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'crm-companies',
      label: 'Empresa (CRM)',
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'contacts',
      label: 'Contato',
    },
    {
      name: 'origin',
      type: 'text',
      label: 'Origem',
    },
    {
      name: 'interest',
      type: 'text',
      label: 'Interesse',
    },
    {
      name: 'groupOrganization',
      type: 'relationship',
      relationTo: 'organizations',
      label: 'Empresa do Grupo',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'novo',
      options: LEAD_STATUSES.map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
      })),
      label: 'Status',
    },
    {
      name: 'temperature',
      type: 'select',
      required: true,
      defaultValue: 'frio',
      options: [
        { label: 'Frio', value: 'frio' },
        { label: 'Morno', value: 'morno' },
        { label: 'Quente', value: 'quente' },
      ],
      label: 'Temperatura',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      label: 'Responsável',
    },
    {
      name: 'estimatedValue',
      type: 'number',
      label: 'Valor estimado',
    },
    {
      name: 'probability',
      type: 'number',
      min: 0,
      max: 100,
      label: 'Probabilidade (%)',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações',
    },
  ],
};
