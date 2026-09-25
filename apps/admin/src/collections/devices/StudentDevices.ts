import type { CollectionConfig } from 'payload';

import { canManageDevices } from '../../services/devices/policy';

/**
 * Device Access Control — dispositivos de alunos.
 * Somente leitura no Admin UI (Master/Admin); mutações apenas via serviço
 * (`services/devices`), que serializa por aluno e audita. `tokenHash` nunca sai pela API.
 */
export const StudentDevices: CollectionConfig = {
  slug: 'student-devices',
  labels: { singular: 'Dispositivo de aluno', plural: 'Dispositivos de alunos' },
  admin: {
    group: 'Controle de Dispositivos',
    useAsTitle: 'label',
    defaultColumns: ['label', 'student', 'status', 'lastSeenAt', 'createdAt'],
    description:
      'Dispositivos registrados por alunos (Device Access Control). Ações: /dispositivos no painel.',
  },
  access: {
    read: ({ req: { user } }) => canManageDevices(user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'student', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    { name: 'label', type: 'text', required: true },
    {
      name: 'deviceType',
      type: 'select',
      required: true,
      defaultValue: 'unknown',
      options: ['desktop', 'mobile', 'tablet', 'unknown'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PENDING',
      index: true,
      options: ['AUTHORIZED', 'PENDING', 'REVOKED', 'REPLACED', 'DENIED', 'EXPIRED'],
    },
    { name: 'approvedVia', type: 'select', options: ['AUTO', 'REQUEST', 'ADMIN'] },
    { name: 'approvedBy', type: 'relationship', relationTo: 'users' },
    { name: 'company', type: 'relationship', relationTo: 'companies', index: true },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'revokedAt', type: 'date' },
  ],
  timestamps: true,
};
