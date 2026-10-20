import type { GlobalConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

/**
 * Placeholder do Dashboard Partner Network no menu Admin.
 * Métricas, mapa e fila de moderação virão em fases futuras.
 */
export const PartnerNetworkDashboard: GlobalConfig = {
  slug: 'partner-network-dashboard',
  label: 'Dashboard',
  admin: {
    group: 'Partner Network',
    description: 'Visão geral da rede de parceiros (placeholder — Sprint 2.3).',
  },
  access: {
    read: staffOnly,
    update: adminsOnly,
  },
  fields: [
    {
      name: 'placeholderNote',
      type: 'textarea',
      label: 'Aviso',
      defaultValue:
        'Dashboard Partner Network — em construção. Métricas, fila de aprovação e mapa geográfico serão adicionados em fases futuras. Use Parceiros e Categorias neste grupo para o CRUD administrativo.',
      admin: {
        readOnly: true,
      },
    },
  ],
};
