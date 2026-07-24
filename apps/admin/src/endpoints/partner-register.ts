import type { Endpoint, PayloadRequest } from 'payload';

import {
  PARTNER_REGISTER_EMAIL_TIMEOUT_MS,
  PARTNER_REGISTER_GEOCODE_TIMEOUT_MS,
} from '@omnia/shared';

import {
  clientIpFromHeaders,
  formatRetryAfterMinutes,
  isPartnerRegisterBodyTooLarge,
  isPartnerRegisterHoneypotTriggered,
  isTrustedPartnerOrigin,
  peekPartnerRegisterQuota,
  recordPartnerRegisterAbuse,
  recordPartnerRegisterSuccess,
  validatePartnerRegisterBody,
} from '../lib/partner-register';
import { applyPartnerLocationResolution } from '../lib/partners/resolve-partner-location';

type ApiBody = {
  success: boolean;
  ok: boolean;
  code?: string;
  message: string;
  retryAfter?: number;
  error?: { code: string; message: string };
};

function json(status: number, body: ApiBody, extraHeaders?: Record<string, string>): Response {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    ...extraHeaders,
  };
  if (body.retryAfter != null && status === 429) {
    headers['Retry-After'] = String(body.retryAfter);
  }
  return Response.json(body, { status, headers });
}

function fail(
  status: number,
  code: string,
  message: string,
  retryAfter?: number,
): Response {
  return json(status, {
    success: false,
    ok: false,
    code,
    message,
    retryAfter,
    error: { code, message },
  });
}

function ok(message: string, code = 'REGISTERED'): Response {
  return json(200, {
    success: true,
    ok: true,
    code,
    message,
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const partnerRegisterEndpoint: Endpoint = {
  path: '/omnia/partner-register',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const origin = req.headers.get('origin');
      if (!isTrustedPartnerOrigin(origin)) {
        return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
      }

      if (isPartnerRegisterBodyTooLarge(req.headers.get('content-length'))) {
        return fail(413, 'BAD_REQUEST', 'Payload muito grande.');
      }

      const body = (await req.json?.()) ?? {};
      const ip = clientIpFromHeaders(req.headers) || 'unknown';

      if (isPartnerRegisterHoneypotTriggered(body)) {
        const abuse = await recordPartnerRegisterAbuse({ ip });
        if (!abuse.allowed) {
          const retryAfter = abuse.retryAfterSeconds ?? 120;
          return fail(
            429,
            'RATE_LIMITED',
            `Muitas tentativas. Tente novamente em ${formatRetryAfterMinutes(retryAfter)}.`,
            retryAfter,
          );
        }
        // Resposta neutra — não revela honeypot.
        return ok(
          'Cadastro enviado com sucesso. Nossa equipe fará a análise.',
          'REGISTERED',
        );
      }

      const validated = validatePartnerRegisterBody(body);
      if (!validated.ok) {
        const abuse = await recordPartnerRegisterAbuse({ ip });
        if (!abuse.allowed) {
          const retryAfter = abuse.retryAfterSeconds ?? 120;
          return fail(
            429,
            'RATE_LIMITED',
            `Muitas tentativas. Tente novamente em ${formatRetryAfterMinutes(retryAfter)}.`,
            retryAfter,
          );
        }
        return fail(422, 'UNPROCESSABLE', validated.message);
      }

      const d = validated.data;

      // Idempotência: documento ou e-mail já pending/aprovado → não duplica.
      const existing = await req.payload.find({
        collection: 'partners',
        where: {
          or: [{ document: { equals: d.document } }, { email: { equals: d.email } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (existing.totalDocs > 0) {
        const doc = existing.docs[0] as { status?: string };
        const status = typeof doc.status === 'string' ? doc.status : '';
        if (status === 'pending' || status === 'approved' || status === 'draft') {
          return ok(
            'Seu cadastro já foi recebido e está em análise.',
            'ALREADY_RECEIVED',
          );
        }
        return fail(
          409,
          'CONFLICT',
          'Já existe um cadastro com estes dados. Entre em contato com o suporte se precisar atualizar.',
        );
      }

      const quota = await peekPartnerRegisterQuota({ ip, email: d.email });
      if (!quota.allowed) {
        const retryAfter = quota.retryAfterSeconds ?? 120;
        if (quota.reason === 'redis_unavailable') {
          return fail(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.', retryAfter);
        }
        return fail(
          429,
          'RATE_LIMITED',
          `Muitas tentativas. Tente novamente em ${formatRetryAfterMinutes(retryAfter)}.`,
          retryAfter,
        );
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      let geocodingStatus: 'pending' | 'success' | 'failed' | 'manual' = 'pending';
      let geocodingProvider: string | undefined;
      let geocodedAt: string | undefined;

      try {
        const resolved = await withTimeout(
          applyPartnerLocationResolution(
            {
              zipCode: d.zipCode,
              address: d.address,
              addressNumber: d.addressNumber,
              neighborhood: d.neighborhood,
              city: d.city,
              state: d.state,
              country: d.country,
            },
            null,
            { force: true },
          ),
          PARTNER_REGISTER_GEOCODE_TIMEOUT_MS,
          'geo_timeout',
        );
        if (resolved.zipCode) d.zipCode = resolved.zipCode;
        if (resolved.address) d.address = resolved.address ?? d.address;
        if (resolved.neighborhood) d.neighborhood = resolved.neighborhood ?? d.neighborhood;
        if (resolved.city) d.city = resolved.city;
        if (resolved.state) d.state = resolved.state;
        if (resolved.country) d.country = resolved.country;
        if (resolved.latitude != null && resolved.longitude != null) {
          latitude = resolved.latitude;
          longitude = resolved.longitude;
        }
        if (resolved.geocodingStatus) geocodingStatus = resolved.geocodingStatus;
        if (resolved.geocodingProvider) geocodingProvider = resolved.geocodingProvider;
        if (resolved.geocodedAt) geocodedAt = resolved.geocodedAt;
      } catch {
        geocodingStatus = 'failed';
        latitude = undefined;
        longitude = undefined;
        geocodedAt = new Date().toISOString();
        req.payload.logger.warn('partner-register: geocode skipped or timed out');
      }

      const createData = {
        companyName: d.companyName,
        tradeName: d.tradeName ?? undefined,
        slug: d.slug,
        partnerType: d.partnerType,
        document: d.document,
        description: d.description ?? undefined,
        servicesDescription: d.servicesDescription ?? undefined,
        brandsServed: d.brandsServed,
        email: d.email,
        phone: d.phone ?? undefined,
        whatsapp: d.whatsapp ?? undefined,
        website: d.website ?? undefined,
        social: {
          instagram: d.social.instagram ?? undefined,
          linkedin: d.social.linkedin ?? undefined,
        },
        zipCode: d.zipCode ?? undefined,
        address: d.address ?? undefined,
        addressNumber: d.addressNumber ?? undefined,
        addressComplement: d.addressComplement ?? undefined,
        neighborhood: d.neighborhood ?? undefined,
        city: d.city,
        state: d.state,
        country: d.country,
        coverageRadius: d.coverageRadius ?? undefined,
        serviceCities: d.serviceCities,
        categories: d.categoryIds,
        specialties: d.specialtyIds,
        status: 'pending' as const,
        plan: 'free' as const,
        active: false,
        featured: false,
        verified: false,
        geocodingStatus,
        geocodingProvider,
        geocodedAt,
        ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
      };

      await req.payload.create({
        collection: 'partners',
        data: createData,
        overrideAccess: true,
        context: { publicPartnerRegister: true, skipPartnerGeocode: true },
        req,
      });

      // Conta somente após create — falha de geo/SMTP não consome cota.
      await recordPartnerRegisterSuccess({ ip, email: d.email });

      // E-mail best-effort com timeout curto; nunca desfaz o cadastro.
      if (req.payload.sendEmail) {
        void withTimeout(
          req.payload.sendEmail({
            to: d.email,
            subject: 'Cadastro recebido — Rede de Parceiros Omnia Frigo',
            html: `<p>Olá,</p>
<p>Recebemos o cadastro de <strong>${d.tradeName || d.companyName}</strong> na Rede de Parceiros Omnia Frigo.</p>
<p>Nossa equipe analisará as informações antes da publicação.</p>
<p>Atenciosamente,<br/>Omnia Frigo</p>`,
          }),
          PARTNER_REGISTER_EMAIL_TIMEOUT_MS,
          'email_timeout',
        ).catch(() => {
          req.payload.logger.warn('partner-register: confirmation email failed or timed out');
        });
      }

      return ok('Cadastro enviado com sucesso. Nossa equipe fará a análise.', 'REGISTERED');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('slug')) {
        return fail(
          422,
          'UNPROCESSABLE',
          'Não foi possível concluir o cadastro (identificador em uso). Tente outro nome fantasia.',
        );
      }
      req.payload.logger.error('partner-register: failed');
      return fail(
        500,
        'INTERNAL_ERROR',
        'Não foi possível concluir agora. Seus dados foram preservados. Tente novamente.',
      );
    }
  },
};
