/**
 * Áreas de interesse para captação pública de leads (Release 2.1).
 */
export const LEAD_INTEREST_AREAS = [
  { label: 'Refrigeração industrial', value: 'refrigeracao-industrial' },
  { label: 'Refrigeração comercial', value: 'refrigeracao-comercial' },
  { label: 'HVAC-R', value: 'hvacr' },
  { label: 'Engenharia e projetos', value: 'engenharia-projetos' },
  { label: 'Eficiência energética', value: 'eficiencia-energetica' },
  { label: 'Automação industrial', value: 'automacao-industrial' },
  { label: 'Inteligência artificial aplicada à refrigeração', value: 'ia-refrigeracao' },
  { label: 'Neurofrigo Command IA', value: 'neurofrigo-command' },
  { label: 'Neurofrigo Carga', value: 'neurofrigo-carga' },
  { label: 'Cursos técnicos', value: 'cursos-tecnicos' },
  { label: 'Especialização profissional', value: 'especializacao' },
  { label: 'Treinamentos empresariais', value: 'treinamentos' },
  { label: 'Parcerias', value: 'parcerias' },
  { label: 'Consultoria', value: 'consultoria' },
  { label: 'Outro', value: 'outro' },
] as const;

export type LeadInterestArea = (typeof LEAD_INTEREST_AREAS)[number]['value'];

export function isLeadInterestArea(value: unknown): value is LeadInterestArea {
  return typeof value === 'string' && LEAD_INTEREST_AREAS.some((entry) => entry.value === value);
}

/** Janela de deduplicação de leads (mesmo contato + campanha + interesse). */
export const LEAD_CAPTURE_DEDUPE_WINDOW_MS = 15 * 60 * 1000;

/** Versão da política de privacidade registrada no consentimento de lead. */
export const LEAD_CAPTURE_PRIVACY_POLICY_VERSION = '2026-07-01';

/** Limite de submissões por chave (IP / e-mail / WhatsApp) na janela. */
export const LEAD_CAPTURE_RATE_LIMIT_MAX = 5;

/** Janela do rate limit público (ms). */
export const LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Tamanho máximo do JSON de entrada (bytes aproximados). */
export const LEAD_CAPTURE_MAX_BODY_BYTES = 8_192;
