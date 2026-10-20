import type { CollectionConfig } from 'payload';

import { canManageDevices } from '../../services/devices/policy';

/** Device Access Control — solicitações de novo dispositivo (PENDING/APPROVED/DENIED/CANCELLED). */
export const DeviceAccessRequests: CollectionConfig = {
  slug: 'device-access-requests',
  labels: { singular: 'Solicitação de dispositivo', plural: 'Solicitações de dispositivo' },
  admin: {
    group: 'Controle de Dispositivos',
    useAsTitle: 'status',
    defaultColumns: ['student', 'status', 'device', 'createdAt', 'reviewedAt'],
    description: 'Somente leitura aqui. Aprovar/negar/substituir em /dispositivos no painel.',
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
      name: 'device',
      type: 'relationship',
      relationTo: 'student-devices',
      required: true,
      index: true,
    },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PENDING',
      index: true,
      options: ['PENDING', 'APPROVED', 'DENIED', 'CANCELLED'],
    },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'reviewedAt', type: 'date' },
    { name: 'reviewNote', type: 'textarea' },
    { name: 'company', type: 'relationship', relationTo: 'companies', index: true },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
  ],
  timestamps: true,
};
