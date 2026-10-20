export const PUBLIC_PARTNER_LIST_DEFAULT_LIMIT = 12;
export const PUBLIC_PARTNER_LIST_MAX_LIMIT = 48;
export const PUBLIC_PARTNER_HOME_LIMIT = 4;
export const PUBLIC_PARTNER_DEFAULT_RADIUS_KM = 50;
export const PUBLIC_PARTNER_MAX_RADIUS_KM = 500;

/** Limite de cadastros bem-sucedidos (IP + e-mail) por janela. */
export const PARTNER_REGISTER_RATE_LIMIT_MAX = 5;
export const PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Limite de abuso (honeypot / payload inválido reiterado) — mais permissivo. */
export const PARTNER_REGISTER_ABUSE_RATE_LIMIT_MAX = 20;
export const PARTNER_REGISTER_MAX_BODY_BYTES = 64 * 1024;
/** Timeout de geocodificação no cadastro público (ms). */
export const PARTNER_REGISTER_GEOCODE_TIMEOUT_MS = 8_000;
/** Timeout de e-mail transacional (ms) — não bloqueia a resposta. */
export const PARTNER_REGISTER_EMAIL_TIMEOUT_MS = 3_000;

export const PARTNER_WHATSAPP_PREFILL =
  'Olá, encontrei sua empresa na Rede de Parceiros Omnia Frigo e gostaria de solicitar um orçamento.';
