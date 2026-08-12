import type { CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

/**
 * Especialidades técnicas do Partner Network (N:N com partners).
 */
export const PartnerSpecialties: CollectionConfig = {
  slug: 'partner-specialties',
  labels: {
    singular: 'Especialidade',
    plural: 'Especialidades',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'category', 'sortOrder', 'active', 'updatedAt'],
    group: 'Partner Network',
    description: 'Capacidades técnicas (instalação, PMOC, VRF, amônia, etc.).',
  },
  timestamps: true,
  access: {
    read: staffOnly,
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'partner-categories',
      label: 'Categoria relacionada',
      admin: {
        description: 'Opcional — agrupa a especialidade sob uma categoria.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Ordem',
      defaultValue: 100,
      admin: {
        step: 1,
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
  ],
};

/** Exemplos sugeridos (não seed automático — criar no Admin). */
export const PARTNER_SPECIALTY_EXAMPLES = [
  'Instalação',
  'Manutenção Preventiva',
  'Manutenção Corretiva',
  'PMOC',
  'Retrofit',
  'Automação',
  'Câmara Fria',
  'Chiller',
  'VRF',
  'Rack de Refrigeração',
  'Refrigeração com Amônia',
  'Refrigeração com CO₂',
  'Sistemas com Glicol',
  'Split',
  'HVAC',
  'Elétrica Industrial',
  'Painéis Elétricos',
  'Eficiência Energética',
  'Comissionamento',
  'Balanceamento',
  'Termografia',
  'Detecção de Vazamentos',
] as const;
