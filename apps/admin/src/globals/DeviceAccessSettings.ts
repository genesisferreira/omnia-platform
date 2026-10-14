import type { GlobalConfig } from 'payload';

import { invalidateDeviceSettingsCache } from '../services/devices/settings-cache';
import {
  canChangeDevicePolicy,
  canManageDevices,
  isValidMaxDevices,
  settingsChangeEvents,
} from '../services/devices/policy';

/**
 * Device Access Control — política global (Master Admin = super_admin).
 * Default persistido: enabled=false. Emergency OFF = desmarcar `enabled` (efeito imediato:
 * cache invalidado no afterChange; TTL máximo de 5 s em qualquer outro caminho).
 */
export const DeviceAccessSettings: GlobalConfig = {
  slug: 'device-access-settings',
  label: 'Controle de Dispositivos',
  admin: {
    group: 'Controle de Dispositivos',
    description:
      'Limita dispositivos por ALUNO (role student). Instructor/admin/super_admin nunca são limitados. Desligar = Emergency OFF imediato (registros preservados).',
  },
  access: {
    read: ({ req: { user } }) => canManageDevices(user),
    update: ({ req: { user } }) => canChangeDevicePolicy(user),
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (data && req.user) data.updatedBy = req.user.id;
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        invalidateDeviceSettingsCache();
        const actorId = req.user ? String(req.user.id) : 'system';
        for (const ev of settingsChangeEvents(previousDoc, doc, actorId)) {
          try {
            await req.payload.create({
              collection: 'lms-audit-events',
              data: {
                action: ev.action,
                actorId: ev.actorId,
                previousValue: (ev.previousValue ?? null) as never,
                newValue: (ev.newValue ?? null) as never,
                metadata: (ev.metadata ?? null) as never,
              },
              overrideAccess: true,
              req,
            });
          } catch (err) {
            req.payload.logger.warn({
              msg: 'device.settings.audit_failed',
              error: err instanceof Error ? err.message : 'unknown',
            });
          }
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'DEVICE ACCESS CONTROL ativo',
      defaultValue: false,
    },
    {
      name: 'defaultMaxDevices',
      type: 'number',
      label: 'Máximo padrão de dispositivos por aluno',
      required: true,
      defaultValue: 2,
      min: 1,
      max: 100,
      validate: (value: unknown) => isValidMaxDevices(value) || 'Informe um inteiro entre 1 e 100.',
      admin: {
        description:
          'Aumentar: efeito imediato. Reduzir: ninguém é expulso; alunos acima do novo limite ficam over-limit e não registram NOVOS dispositivos até ficarem abaixo.',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
};
