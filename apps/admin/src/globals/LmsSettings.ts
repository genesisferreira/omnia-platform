import type { GlobalConfig } from 'payload';

import { adminsOnly } from '../access/rbac';

/**
 * Configuração administrativa mínima do LMS Connector / Session Policy.
 * Segue padrão Global da plataforma.
 */
export const LmsSettings: GlobalConfig = {
  slug: 'lms-settings',
  label: 'LMS — Políticas',
  admin: {
    group: 'LMS',
    description:
      'Políticas de sessão e flags do connector. Alterações são auditadas. Token Moodle permanece apenas em variáveis de ambiente do servidor.',
  },
  access: {
    read: adminsOnly,
    update: adminsOnly,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        if (!data || !req.user) return data;
        try {
          await req.payload.create({
            collection: 'lms-audit-events',
            data: {
              action: 'lms.policy.update',
              actorId: String(req.user.id),
              previousValue: originalDoc ?? null,
              newValue: data,
              reason: typeof data.changeReason === 'string' ? data.changeReason : null,
            },
            overrideAccess: true,
            req,
          });
        } catch (err) {
          req.payload.logger.warn({
            msg: 'lms.policy.audit_failed',
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'connectorEnabled',
      type: 'checkbox',
      label: 'Habilitar LMS Connector',
      defaultValue: false,
      admin: {
        description:
          'Override administrativo. Em runtime, MOODLE_CONNECTOR_ENABLED também precisa estar true no ambiente.',
      },
    },
    {
      name: 'connectorReadOnly',
      type: 'checkbox',
      label: 'Modo read-only',
      defaultValue: true,
    },
    {
      name: 'provisionEnabled',
      type: 'checkbox',
      label: 'Habilitar Academic Provisioning',
      defaultValue: true,
      admin: {
        description:
          'Endpoints internos S2S de provisionamento. Execute real no Moodle permanece bloqueado até ativação.',
      },
    },
    {
      name: 'provisionDryRun',
      type: 'checkbox',
      label: 'Provision dry-run (sem mutação Moodle)',
      defaultValue: true,
      admin: {
        description:
          'Default true. Sprint 3.0 força dry-run mesmo se desmarcado (EXECUTE_DISABLED_UNTIL_ACTIVATION).',
      },
    },
    {
      name: 'sessionPolicyEnabled',
      type: 'checkbox',
      label: 'Habilitar política de sessão',
      defaultValue: true,
    },
    {
      name: 'defaultStudentSessions',
      type: 'number',
      label: 'Limite aluno',
      defaultValue: 1,
      min: 1,
      max: 10,
    },
    {
      name: 'defaultTeacherSessions',
      type: 'number',
      label: 'Limite professor',
      defaultValue: 2,
      min: 1,
      max: 10,
    },
    {
      name: 'defaultManagerSessions',
      type: 'number',
      label: 'Limite gestor',
      defaultValue: 2,
      min: 1,
      max: 10,
    },
    {
      name: 'defaultAdminSessions',
      type: 'number',
      label: 'Limite admin',
      defaultValue: 2,
      min: 1,
      max: 10,
    },
    {
      name: 'revokeOldestOnExceed',
      type: 'checkbox',
      label: 'Revogar sessão anterior ao exceder limite',
      defaultValue: true,
    },
    {
      name: 'sessionTtlSeconds',
      type: 'number',
      label: 'TTL da sessão (segundos)',
      defaultValue: 28800,
      min: 60,
    },
    {
      name: 'sessionHeartbeatSeconds',
      type: 'number',
      label: 'Intervalo de heartbeat (segundos)',
      defaultValue: 60,
      min: 15,
    },
    {
      name: 'downloadsAllowedDefault',
      type: 'checkbox',
      label: 'Downloads padrão (preparado)',
      defaultValue: false,
    },
    {
      name: 'watermarkEnabledDefault',
      type: 'checkbox',
      label: 'Watermark padrão (preparado)',
      defaultValue: true,
    },
    {
      name: 'mediaTtlSecondsDefault',
      type: 'number',
      label: 'TTL futuro de mídia (segundos)',
      defaultValue: 300,
      min: 30,
    },
    {
      name: 'changeReason',
      type: 'textarea',
      label: 'Motivo da alteração (auditoria)',
      admin: {
        description: 'Opcional, mas recomendado. Registrado no evento de auditoria.',
      },
    },
  ],
};
