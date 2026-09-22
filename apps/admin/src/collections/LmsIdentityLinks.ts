import type { CollectionConfig } from 'payload';

import { adminsOnly, isPlatformAdmin } from '../access/rbac';

/**
 * Vínculo mínimo Omnia ↔ Moodle.
 * Sem senha Moodle. Sem provisionamento automático nesta entrega.
 */
export const LmsIdentityLinks: CollectionConfig = {
  slug: 'lms-identity-links',
  labels: {
    singular: 'Vínculo LMS',
    plural: 'Vínculos LMS',
  },
  admin: {
    group: 'LMS',
    useAsTitle: 'omniaUserId',
    defaultColumns: ['omniaUserId', 'moodleUserId', 'moodleUsername', 'status', 'syncStatus'],
    description:
      'Vínculo controlado Omnia ↔ Moodle. Em DEV, criação manual apenas por administrador (auditada).',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user)) return true;
      return { omniaUserId: { equals: String(user.id) } };
    },
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req, originalDoc }) => {
        if (!data) return data;
        if (operation === 'create') {
          data.linkedAt = data.linkedAt || new Date().toISOString();
          data.syncStatus = data.syncStatus || 'never';
          data.status = data.status || 'active';
        }
        // Auditoria mínima via log Payload (coleção de audit separada também registra).
        req.payload.logger.info({
          msg: 'lms.identity_link.change',
          operation,
          actorId: req.user ? String(req.user.id) : null,
          omniaUserId: data.omniaUserId ?? originalDoc?.omniaUserId,
          moodleUserId: data.moodleUserId ?? originalDoc?.moodleUserId,
        });
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'omniaUserId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Omnia User ID',
    },
    {
      name: 'moodleUserId',
      type: 'number',
      required: true,
      index: true,
      label: 'Moodle User ID',
    },
    {
      name: 'moodleUsername',
      type: 'text',
      label: 'Moodle Username',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Ativo', value: 'active' },
        { label: 'Inativo', value: 'inactive' },
        { label: 'Pendente', value: 'pending' },
        { label: 'Erro', value: 'error' },
      ],
    },
    {
      name: 'linkedAt',
      type: 'date',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'syncStatus',
      type: 'select',
      defaultValue: 'never',
      options: [
        { label: 'Nunca', value: 'never' },
        { label: 'Synced', value: 'synced' },
        { label: 'Stale', value: 'stale' },
        { label: 'Erro', value: 'error' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notas (DEV)',
      admin: {
        description: 'Motivo do vínculo manual — obrigatório em alterações administrativas.',
      },
    },
  ],
};
