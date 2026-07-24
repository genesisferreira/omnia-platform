import type { Endpoint, PayloadRequest } from 'payload';

import {
  allowPartnerRegisterRequest,
  clientIpFromHeaders,
  isPartnerRegisterBodyTooLarge,
  isPartnerRegisterHoneypotTriggered,
  isTrustedPartnerOrigin,
  validatePartnerRegisterBody,
} from '../lib/partner-register';
import { getGeocodingProvider } from '../lib/geocoding/provider';

const json = (status: number, body: unknown): Response =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export const partnerRegisterEndpoint: Endpoint = {
  path: '/omnia/partner-register',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const origin = req.headers.get('origin');
      if (!isTrustedPartnerOrigin(origin)) {
        return json(403, {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Origem não autorizada.' },
        });
      }

      if (isPartnerRegisterBodyTooLarge(req.headers.get('content-length'))) {
        return json(413, {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'Payload muito grande.' },
        });
      }

      const body = (await req.json?.()) ?? {};

      if (isPartnerRegisterHoneypotTriggered(body)) {
        return json(200, {
          ok: true,
          message:
            'Cadastro recebido. Nossa equipe analisará as informações antes da publicação.',
        });
      }

      const validated = validatePartnerRegisterBody(body);
      if (!validated.ok) {
        return json(422, {
          ok: false,
          error: { code: 'UNPROCESSABLE', message: validated.message },
        });
      }

      const ip = clientIpFromHeaders(req.headers) || 'unknown';
      const rate = await allowPartnerRegisterRequest({
        ip,
        email: validated.data.email,
      });
      if (!rate.allowed) {
        const status = rate.reason === 'redis_unavailable' ? 503 : 429;
        return json(status, {
          ok: false,
          error: {
            code: status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
            message:
              status === 429
                ? 'Muitas tentativas. Tente novamente em alguns minutos.'
                : 'Serviço temporariamente indisponível.',
          },
        });
      }

      const dupDoc = await req.payload.find({
        collection: 'partners',
        where: { document: { equals: validated.data.document } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (dupDoc.totalDocs > 0) {
        return json(422, {
          ok: false,
          error: {
            code: 'UNPROCESSABLE',
            message: 'Já existe um cadastro com este CPF/CNPJ.',
          },
        });
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const geo = getGeocodingProvider();
        const result = validated.data.zipCode
          ? await geo.geocodeByPostalCode(validated.data.zipCode, validated.data.country)
          : await geo.geocodeByAddress(
              [
                validated.data.address,
                validated.data.addressNumber,
                validated.data.city,
                validated.data.state,
                validated.data.country,
              ]
                .filter(Boolean)
                .join(', '),
            );
        if (result) {
          latitude = result.latitude;
          longitude = result.longitude;
        }
      } catch {
        req.payload.logger.warn('partner-register: geocode skipped');
      }

      const d = validated.data;
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
        // Hooks reforçam; valores explícitos satisfazem GeneratedTypes.
        status: 'pending' as const,
        plan: 'free' as const,
        active: false,
        featured: false,
        verified: false,
        ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
      };

      await req.payload.create({
        collection: 'partners',
        data: createData,
        overrideAccess: true,
        context: { publicPartnerRegister: true },
        req,
      });

      // E-mail transacional: best-effort, não invalida o cadastro.
      try {
        if (req.payload.sendEmail) {
          await req.payload.sendEmail({
            to: d.email,
            subject: 'Cadastro recebido — Rede de Parceiros Omnia Frigo',
            html: `<p>Olá,</p>
<p>Recebemos o cadastro de <strong>${d.tradeName || d.companyName}</strong> na Rede de Parceiros Omnia Frigo.</p>
<p>Nossa equipe analisará as informações antes da publicação. A visibilidade pública depende de aprovação.</p>
<p>Atenciosamente,<br/>Omnia Frigo</p>`,
          });
        }
      } catch {
        req.payload.logger.warn('partner-register: confirmation email failed');
      }

      return json(200, {
        ok: true,
        message:
          'Cadastro recebido. Nossa equipe analisará as informações antes da publicação.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('slug')) {
        return json(422, {
          ok: false,
          error: {
            code: 'UNPROCESSABLE',
            message: 'Não foi possível concluir o cadastro (identificador em uso). Tente outro nome fantasia.',
          },
        });
      }
      req.payload.logger.error('partner-register: failed');
      return json(500, {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Não foi possível concluir o cadastro. Tente novamente.',
        },
      });
    }
  },
};
