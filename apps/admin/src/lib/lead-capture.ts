/**
 * Captação pública de leads — política Release 2.1
 *
 * Deduplicação de Lead (janela 15 min):
 * - Mesmo Contact + mesma área de interesse + mesma utm_campaign → consolida
 *   (atualiza notes + Activity lead_captured; não cria novo Lead).
 * - Nova campanha ou novo interesse → permite novo Lead.
 *
 * Contact: lookup por e-mail normalizado, depois WhatsApp; upsert sem duplicar.
 * CRM Company: match por nome normalizado (caixa/espaços); cria prospect se ausente.
 *
 * Rate limit: in-memory por processo (5 / 15 min por IP, e-mail e WhatsApp).
 * NÃO é distribuído entre réplicas — dívida até @omnia/integrations/redis.
 * IP: preferir X-Real-IP (proxy); X-Forwarded-For só como fallback do primeiro hop.
 *
 * UTMs/LGPD: persistidos em notes estruturados ([lead_capture] / [lgpd]) até
 * campos dedicados em migration futura. Não cria User.
 */
import {
  LEAD_CAPTURE_DEDUPE_WINDOW_MS,
  LEAD_CAPTURE_MAX_BODY_BYTES,
  LEAD_CAPTURE_PRIVACY_POLICY_VERSION,
  LEAD_CAPTURE_RATE_LIMIT_MAX,
  LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS,
  isLeadInterestArea,
  type LeadInterestArea,
} from '@omnia/constants';

export type LeadCapturePublicDto = {
  nome: string;
  email: string;
  whatsapp: string;
  areaInteresse: LeadInterestArea;
  aceitePrivacidade: boolean;
  empresa?: string;
  cargo?: string;
  cidade?: string;
  estado?: string;
  organizationInteresse?: string;
  mensagem?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landingPath?: string;
  pageUrl?: string;
  /** Honeypot — deve permanecer vazio. */
  website?: string;
};

export type NormalizedLeadCapture = {
  nome: string;
  email: string;
  whatsapp: string;
  areaInteresse: LeadInterestArea;
  aceitePrivacidade: true;
  empresa: string | null;
  cargo: string | null;
  cidade: string | null;
  estado: string | null;
  organizationInteresse: string | null;
  mensagem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landingPath: string;
  pageUrl: string | null;
  source: 'landing_page';
  privacyPolicyVersion: string;
  consentOrigin: 'lead_capture';
  submittedAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRIPT_RE = /<\s*script|javascript:|on\w+\s*=/i;

export function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Mantém apenas dígitos; exige DDI/DDD BR razoável (10–13 dígitos). */
export function normalizeWhatsapp(value: string): string | null {
  const digits = value.replace(/\D+/g, '');
  if (digits.length < 10 || digits.length > 13) {
    return null;
  }
  return digits;
}

export function normalizeCompanyName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function stripDangerous(value: string, max = 500): string {
  return value.replace(SCRIPT_RE, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  const website = body.website;
  return typeof website === 'string' && website.trim().length > 0;
}

export function isBodyTooLarge(raw: string): boolean {
  return Buffer.byteLength(raw, 'utf8') > LEAD_CAPTURE_MAX_BODY_BYTES;
}

function optionalString(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = stripDangerous(value, max);
  return cleaned.length > 0 ? cleaned : null;
}

export type LeadCaptureValidationResult =
  { ok: true; data: NormalizedLeadCapture } | { ok: false; error: string; status: 400 | 422 };

export function validateLeadCaptureBody(
  body: Record<string, unknown>,
  now = new Date(),
): LeadCaptureValidationResult {
  if (body.aceitePrivacidade !== true) {
    return {
      ok: false,
      status: 400,
      error: 'É necessário aceitar o uso dos dados para contato comercial.',
    };
  }

  const nomeRaw = typeof body.nome === 'string' ? normalizeName(body.nome) : '';
  const emailRaw = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const whatsappRaw = typeof body.whatsapp === 'string' ? body.whatsapp : '';
  const area = body.areaInteresse;

  if (!nomeRaw || nomeRaw.length < 2) {
    return { ok: false, status: 400, error: 'Informe o nome completo.' };
  }

  if (!EMAIL_RE.test(emailRaw)) {
    return { ok: false, status: 400, error: 'Informe um e-mail válido.' };
  }

  const whatsapp = normalizeWhatsapp(whatsappRaw);
  if (!whatsapp) {
    return { ok: false, status: 400, error: 'Informe um WhatsApp válido com DDD.' };
  }

  if (!isLeadInterestArea(area)) {
    return { ok: false, status: 422, error: 'Área de interesse inválida.' };
  }

  const landingPath =
    optionalString(body.landingPath, 200) ||
    optionalString(body.pageUrl, 500)?.replace(/^https?:\/\/[^/]+/i, '') ||
    '/interesse';

  return {
    ok: true,
    data: {
      nome: stripDangerous(nomeRaw, 120),
      email: emailRaw,
      whatsapp,
      areaInteresse: area,
      aceitePrivacidade: true,
      empresa: optionalString(body.empresa, 160),
      cargo: optionalString(body.cargo, 120),
      cidade: optionalString(body.cidade, 80),
      estado: optionalString(body.estado, 40),
      organizationInteresse: optionalString(body.organizationInteresse, 64),
      mensagem: optionalString(body.mensagem, 1000),
      utm_source: optionalString(body.utm_source, 120),
      utm_medium: optionalString(body.utm_medium, 120),
      utm_campaign: optionalString(body.utm_campaign, 160),
      utm_content: optionalString(body.utm_content, 160),
      utm_term: optionalString(body.utm_term, 160),
      gclid: optionalString(body.gclid, 120),
      fbclid: optionalString(body.fbclid, 120),
      referrer: optionalString(body.referrer, 500),
      landingPath,
      pageUrl: optionalString(body.pageUrl, 500),
      source: 'landing_page',
      privacyPolicyVersion: LEAD_CAPTURE_PRIVACY_POLICY_VERSION,
      consentOrigin: 'lead_capture',
      submittedAt: now.toISOString(),
    },
  };
}

export function buildConsentNote(data: NormalizedLeadCapture): string {
  return [
    '[lgpd]',
    `accepted=true`,
    `acceptedAt=${data.submittedAt}`,
    `policyVersion=${data.privacyPolicyVersion}`,
    `consentOrigin=${data.consentOrigin}`,
    `landingPath=${data.landingPath}`,
  ].join('\n');
}

export function buildLeadNotes(data: NormalizedLeadCapture): string {
  const lines = [
    '[lead_capture]',
    `source=${data.source}`,
    `area=${data.areaInteresse}`,
    `submittedAt=${data.submittedAt}`,
    data.utm_source ? `utm_source=${data.utm_source}` : null,
    data.utm_medium ? `utm_medium=${data.utm_medium}` : null,
    data.utm_campaign ? `utm_campaign=${data.utm_campaign}` : null,
    data.utm_content ? `utm_content=${data.utm_content}` : null,
    data.utm_term ? `utm_term=${data.utm_term}` : null,
    data.gclid ? `gclid=${data.gclid}` : null,
    data.fbclid ? `fbclid=${data.fbclid}` : null,
    data.referrer ? `referrer=${data.referrer}` : null,
    data.pageUrl ? `pageUrl=${data.pageUrl}` : null,
    data.mensagem ? `mensagem=${data.mensagem}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function isWithinDedupeWindow(
  createdAt: string | Date,
  now = new Date(),
  windowMs = LEAD_CAPTURE_DEDUPE_WINDOW_MS,
): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(created.getTime())) {
    return false;
  }
  return now.getTime() - created.getTime() <= windowMs;
}

export function sameCampaignAndInterest(
  lead: { interest?: string | null; notes?: string | null; origin?: string | null },
  data: NormalizedLeadCapture,
): boolean {
  if (lead.origin !== 'landing_page') {
    return false;
  }
  if ((lead.interest || '') !== data.areaInteresse) {
    return false;
  }
  const campaign = data.utm_campaign || '';
  const notes = lead.notes || '';
  const notedCampaign = /utm_campaign=([^\n]+)/.exec(notes)?.[1] || '';
  return notedCampaign === campaign;
}

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetLeadCaptureRateLimitForTests(): void {
  rateBuckets.clear();
}

/**
 * Rate limit em memória (fallback). Preferência operacional: Redis compartilhado
 * quando o conector @omnia/integrations/redis estiver disponível.
 * Limite: 5 / 15 min por IP, e-mail e WhatsApp.
 */
export function allowLeadCaptureRequest(keys: string[]): boolean {
  const now = Date.now();
  for (const key of keys) {
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS });
      continue;
    }
    bucket.count += 1;
    if (bucket.count > LEAD_CAPTURE_RATE_LIMIT_MAX) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve IP do cliente atrás de proxy.
 * Preferência: X-Real-IP (definido pelo reverse proxy).
 * X-Forwarded-For: usa apenas o primeiro hop e não confia cegamente em cadeia spoofável.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp && realIp.length <= 64 && !realIp.includes(',')) {
    return realIp;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim() || '';
    if (first && first.length <= 64) {
      return first;
    }
  }

  return 'unknown';
}

export function isTrustedOrigin(origin: string | null, trusted: string[]): boolean {
  if (!origin) {
    return false;
  }
  try {
    const normalized = new URL(origin).origin;
    return trusted.some((entry) => {
      try {
        return new URL(entry).origin === normalized;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export {
  LEAD_CAPTURE_DEDUPE_WINDOW_MS,
  LEAD_CAPTURE_MAX_BODY_BYTES,
  LEAD_CAPTURE_PRIVACY_POLICY_VERSION,
  LEAD_CAPTURE_RATE_LIMIT_MAX,
  LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS,
};
