import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from 'payload';
import { APIError } from 'payload';

import { isPlatformAdmin } from '../../access/rbac';

/**
 * beforeChange — regras de status e preparação para integrações futuras.
 *
 * Futuro:
 * - geocode (CEP → lat/lng) quando endereço mudar
 * - sincronização parcial com CRM (CrmCompanies / Contacts)
 * - invalidação de cache de busca geográfica
 * - notificação de fila de moderação
 */
export const partnerBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data;
  }

  if (operation === 'create') {
    // Novo parceiro inicia sempre como Pending (independente do valor enviado).
    data.status = 'pending';
    data.approvedAt = null;
    data.approvedBy = null;
    return data;
  }

  const previousStatus =
    typeof originalDoc?.status === 'string' ? originalDoc.status : undefined;

  if (
    typeof data.status === 'string' &&
    previousStatus !== undefined &&
    data.status !== previousStatus
  ) {
    // Somente Administrador pode alterar para Approved / Rejected / Suspended
    // (e qualquer outra transição de status nesta fase).
    if (!isPlatformAdmin(req.user)) {
      throw new APIError(
        'Somente administradores podem alterar o status do parceiro (Approved, Rejected, Suspended).',
        403,
      );
    }

    if (data.status === 'approved' && previousStatus !== 'approved') {
      data.approvedAt = new Date().toISOString();
      if (req.user?.id != null) {
        data.approvedBy = req.user.id;
      }
    }

    // Se sair de approved, mantém histórico (approvedAt / approvedBy) nesta fase.
  }

  return data;
};

/**
 * afterChange — hooks preparados para integrações futuras.
 *
 * Futuro:
 * - espelho de PartnerLead / Activity no CRM
 * - indexação geoespacial / fila de reindex
 * - e-mail de aprovação / rejeição ao parceiro
 * - publicação condicional no diretório público
 * - webhooks / Neurofrigo IA (enriquecimento de perfil)
 */
export const partnerAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  // Placeholder: sem lógica complexa na Sprint 2.3 (estrutura admin only).
  void previousDoc;
  void operation;
  void req;

  return doc;
};
