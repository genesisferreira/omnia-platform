import {
  PARTNER_REGISTER_ABUSE_RATE_LIMIT_MAX,
  PARTNER_REGISTER_MAX_BODY_BYTES,
  PARTNER_REGISTER_RATE_LIMIT_MAX,
  PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS,
  normalizePartnerSlug,
  slugSourceFromPartner,
  validateBrazilianDocument,
} from '@omnia/shared';
import { checkRateLimit, clientIpFromHeaders, peekRateLimit } from '@omnia/shared/rate-limit';

import { getAllowedCorsOrigins } from './allowed-origins';

export { clientIpFromHeaders };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRIPT_RE = /<\s*script|javascript:|on\w+\s*=/i;

/** Campos que o visitante NUNCA pode definir (mass assignment). */
export const PARTNER_REGISTER_BLOCKED_KEYS = [
  'status',
  'featured',
  'verified',
  'plan',
  'active',
  'approvalNotes',
  'approvedAt',
  'approvedBy',
  'publishedAt',
  'ownerUser',
  'id',
  'createdAt',
  'updatedAt',
  'latitude',
  'longitude',
] as const;

export type PartnerRegisterInput = {
  companyName: string;
  tradeName?: string;
  partnerType: 'company' | 'professional';
  document: string;
  description?: string;
  servicesDescription?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country?: string;
  coverageRadius?: number;
  categoryIds?: number[];
  specialtyIds?: number[];
  serviceCities?: Array<{ city: string; state?: string }>;
  brandsServed?: string[];
  privacyAccepted: boolean;
  analysisAuthorized: boolean;
  truthfulnessConfirmed: boolean;
  /** Honeypot — deve ficar vazio. */
  companyWebsite?: string;
};

export type NormalizedPartnerRegister = {
  companyName: string;
  tradeName: string | null;
  partnerType: 'company' | 'professional';
  document: string;
  description: string | null;
  servicesDescription: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  social: {
    instagram: string | null;
    linkedin: string | null;
  };
  zipCode: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  country: string;
  coverageRadius: number | null;
  categoryIds: number[];
  specialtyIds: number[];
  serviceCities: Array<{ city: string; state?: string }>;
  brandsServed: Array<{ name: string }>;
  slug: string;
};

function cleanText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const t = value.replace(/\s+/g, ' ').trim();
  if (!t || SCRIPT_RE.test(t)) {
    return null;
  }
  return t.slice(0, max);
}

function normalizeWhatsapp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    return null;
  }
  return digits;
}

export function isPartnerRegisterHoneypotTriggered(body: unknown): boolean {
  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  if (!rec) {
    return false;
  }
  const hp = rec.companyWebsite ?? rec.website_hp;
  return typeof hp === 'string' && hp.trim() !== '';
}

export function isTrustedPartnerOrigin(origin: string | null): boolean {
  if (!origin) {
    return true;
  }
  return getAllowedCorsOrigins().includes(origin);
}

export function isPartnerRegisterBodyTooLarge(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const n = Number(contentLength);
  return Number.isFinite(n) && n > PARTNER_REGISTER_MAX_BODY_BYTES;
}

function partnerRegisterRedisMode(): 'fail-closed' | 'memory-fallback' {
  const deployEnv = (process.env.APP_ENV || process.env.OMNIA_ENV || '').toLowerCase();
  if (deployEnv === 'staging' || deployEnv === 'development' || deployEnv === 'dev') {
    return 'memory-fallback';
  }
  if (deployEnv === 'production') {
    return 'fail-closed';
  }
  // Sem APP_ENV: imagem Next com NODE_ENV=production mas Redis presente → fallback seguro em homolog.
  return 'memory-fallback';
}

export type PartnerRegisterRateResult = {
  allowed: boolean;
  reason: string;
  retryAfterSeconds?: number;
};

/** Pré-checagem sem incrementar (cadastros bem-sucedidos na janela). */
export async function peekPartnerRegisterQuota(args: {
  ip: string;
  email: string;
}): Promise<PartnerRegisterRateResult> {
  const decision = await peekRateLimit({
    scope: 'partner-register',
    subjects: [
      { value: args.ip },
      { value: args.email, hash: true },
    ],
    max: PARTNER_REGISTER_RATE_LIMIT_MAX,
    windowMs: PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS,
    onRedisUnavailable: partnerRegisterRedisMode(),
  });
  return {
    allowed: decision.allowed,
    reason: decision.reason,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

/**
 * Incrementa após create OK (IP + e-mail hasheado).
 * Não chamar em falha de geo/SMTP/infra.
 */
export async function recordPartnerRegisterSuccess(args: {
  ip: string;
  email: string;
}): Promise<PartnerRegisterRateResult> {
  const decision = await checkRateLimit({
    scope: 'partner-register',
    subjects: [
      { value: args.ip },
      { value: args.email, hash: true },
    ],
    max: PARTNER_REGISTER_RATE_LIMIT_MAX,
    windowMs: PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS,
    onRedisUnavailable: partnerRegisterRedisMode(),
  });
  return {
    allowed: decision.allowed,
    reason: decision.reason,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

/** @deprecated Preferir peek + record pós-sucesso. Mantido para compatibilidade de testes. */
export async function allowPartnerRegisterRequest(args: {
  ip: string;
  email: string;
}): Promise<PartnerRegisterRateResult> {
  return peekPartnerRegisterQuota(args);
}

/** Honeypot / payload inválido reiterado — escopo separado, limite maior. */
export async function recordPartnerRegisterAbuse(args: {
  ip: string;
}): Promise<PartnerRegisterRateResult> {
  const decision = await checkRateLimit({
    scope: 'partner-register-abuse',
    subjects: [{ value: args.ip }],
    max: PARTNER_REGISTER_ABUSE_RATE_LIMIT_MAX,
    windowMs: PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS,
    onRedisUnavailable: partnerRegisterRedisMode(),
  });
  return {
    allowed: decision.allowed,
    reason: decision.reason,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export function formatRetryAfterMinutes(seconds: number | undefined): string {
  const s =
    seconds && seconds > 0 ? seconds : Math.ceil(PARTNER_REGISTER_RATE_LIMIT_WINDOW_MS / 1000);
  const minutes = Math.max(1, Math.ceil(s / 60));
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

export type ValidatePartnerRegisterResult =
  | { ok: true; data: NormalizedPartnerRegister }
  | { ok: false; message: string };

export function validatePartnerRegisterBody(body: unknown): ValidatePartnerRegisterResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Payload inválido.' };
  }
  const raw = body as Record<string, unknown>;

  for (const key of PARTNER_REGISTER_BLOCKED_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      // Ignora silenciosamente campos admin (não falha — evita probing),
      // mas nunca os aplica. Validação abaixo só lê whitelist.
      void key;
    }
  }

  if (raw.privacyAccepted !== true) {
    return { ok: false, message: 'É necessário aceitar a política de privacidade.' };
  }
  if (raw.analysisAuthorized !== true) {
    return { ok: false, message: 'É necessário autorizar a análise cadastral.' };
  }
  if (raw.truthfulnessConfirmed !== true) {
    return { ok: false, message: 'Confirme a veracidade das informações.' };
  }

  const companyName = cleanText(raw.companyName, 200);
  if (!companyName) {
    return { ok: false, message: 'Informe a razão social ou nome profissional.' };
  }

  const tradeName = cleanText(raw.tradeName, 200);
  const partnerType = raw.partnerType === 'professional' ? 'professional' : 'company';

  const doc = validateBrazilianDocument(raw.document);
  if (!doc.ok) {
    return { ok: false, message: doc.message };
  }

  const emailRaw = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(emailRaw)) {
    return { ok: false, message: 'E-mail inválido.' };
  }

  const city = cleanText(raw.city, 120);
  const state = cleanText(raw.state, 2)?.toUpperCase() ?? null;
  if (!city || !state || state.length !== 2) {
    return { ok: false, message: 'Informe cidade e UF (2 letras).' };
  }

  let coverageRadius: number | null = null;
  if (raw.coverageRadius !== undefined && raw.coverageRadius !== null && raw.coverageRadius !== '') {
    const n = Number(raw.coverageRadius);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: 'Raio de atendimento inválido.' };
    }
    coverageRadius = n;
  }

  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const specialtyIds = Array.isArray(raw.specialtyIds)
    ? raw.specialtyIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const serviceCities: Array<{ city: string; state?: string }> = [];
  if (Array.isArray(raw.serviceCities)) {
    for (const item of raw.serviceCities) {
      if (!item || typeof item !== 'object') continue;
      const c = cleanText((item as { city?: unknown }).city, 120);
      if (!c) continue;
      const st = cleanText((item as { state?: unknown }).state, 2)?.toUpperCase();
      serviceCities.push(st ? { city: c, state: st } : { city: c });
    }
  }

  const brandsServed: Array<{ name: string }> = [];
  if (Array.isArray(raw.brandsServed)) {
    for (const b of raw.brandsServed) {
      const name = cleanText(typeof b === 'string' ? b : (b as { name?: unknown })?.name, 80);
      if (name) brandsServed.push({ name });
    }
  }

  const slug =
    slugSourceFromPartner({
      tradeName: tradeName ?? undefined,
      companyName,
    }) ?? normalizePartnerSlug(companyName);

  if (!slug) {
    return { ok: false, message: 'Não foi possível gerar o slug do parceiro.' };
  }

  return {
    ok: true,
    data: {
      companyName,
      tradeName,
      partnerType,
      document: doc.digits,
      description: cleanText(raw.description, 4000),
      servicesDescription: cleanText(raw.servicesDescription, 4000),
      email: emailRaw,
      phone: cleanText(raw.phone, 40),
      whatsapp: normalizeWhatsapp(raw.whatsapp),
      website: cleanText(raw.website, 300),
      social: {
        instagram: cleanText(raw.instagram, 200),
        linkedin: cleanText(raw.linkedin, 300),
      },
      zipCode: cleanText(raw.zipCode, 12)?.replace(/\D/g, '') ?? null,
      address: cleanText(raw.address, 300),
      addressNumber: cleanText(raw.addressNumber, 20),
      addressComplement: cleanText(raw.addressComplement, 120),
      neighborhood: cleanText(raw.neighborhood, 120),
      city,
      state,
      country: cleanText(raw.country, 80) ?? 'Brasil',
      coverageRadius,
      categoryIds: categoryIds.slice(0, 20),
      specialtyIds: specialtyIds.slice(0, 40),
      serviceCities: serviceCities.slice(0, 30),
      brandsServed: brandsServed.slice(0, 30),
      slug,
    },
  };
}
