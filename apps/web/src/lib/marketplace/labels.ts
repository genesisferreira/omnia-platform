import type { ListingStatus, ProposalStatus, QuoteEventType, QuoteSourceType, QuoteStatus } from '@omnia/shared';

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Rascunho',
  pending: 'Em moderação',
  published: 'Publicado',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
  archived: 'Arquivado',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: 'Enviada',
  in_review: 'Em análise',
  proposal_sent: 'Proposta enviada',
  negotiating: 'Em negociação',
  accepted: 'Aceita',
  declined: 'Recusada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  withdrawn: 'Retirada',
  expired: 'Expirada',
};

export const QUOTE_SOURCE_LABELS: Record<QuoteSourceType, string> = {
  product: 'Produto',
  service: 'Serviço',
  project: 'Projeto',
};

export const QUOTE_EVENT_LABELS: Record<QuoteEventType, string> = {
  request_created: 'Solicitação criada',
  status_changed: 'Status alterado',
  message: 'Mensagem',
  proposal_created: 'Proposta criada',
  proposal_sent: 'Proposta enviada',
  proposal_accepted: 'Proposta aceita',
  proposal_rejected: 'Proposta rejeitada',
  proposal_withdrawn: 'Proposta retirada',
  note: 'Nota interna',
};

export const PRICE_MODE_LABELS = {
  fixed: 'Preço fixo',
  starting_at: 'A partir de',
  on_request: 'Sob consulta',
} as const;

export const PARTNER_PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito',
  professional: 'Professional',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

export const PARTNER_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
};

export const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  editor: 'Editor',
  viewer: 'Visualizador',
};

export function labelOf<T extends string>(map: Record<T, string>, key: string | null | undefined): string {
  if (!key) return '—';
  return (map as Record<string, string>)[key] ?? key;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(date);
}
