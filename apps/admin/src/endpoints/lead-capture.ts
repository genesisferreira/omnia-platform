import type { Endpoint, PayloadRequest } from 'payload';

import {
  allowLeadCaptureRequest,
  buildConsentNote,
  buildLeadNotes,
  clientIpFromHeaders,
  isBodyTooLarge,
  isHoneypotTriggered,
  isTrustedOrigin,
  isWithinDedupeWindow,
  normalizeCompanyName,
  sameCampaignAndInterest,
  validateLeadCaptureBody,
  type NormalizedLeadCapture,
} from '../lib/lead-capture';

type ErrorCode = 'BAD_REQUEST' | 'FORBIDDEN' | 'RATE_LIMITED' | 'UNPROCESSABLE' | 'INTERNAL_ERROR';

const json = (status: number, body: unknown): Response =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const errorResponse = (status: number, code: ErrorCode, message: string): Response =>
  json(status, { ok: false, error: { code, message } });

const successResponse = (deduped: boolean): Response =>
  json(
    200,
    assertPublicSuccessBody({
      ok: true,
      message: deduped
        ? 'Recebemos seu interesse. Nossa equipe já possui seu contato e entrará em contato em breve.'
        : 'Recebemos seu interesse. Nossa equipe entrará em contato em breve.',
    }),
  );

function trustedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_PORTAL_URL,
    process.env.PAYLOAD_PUBLIC_SERVER_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function interestLabel(area: string): string {
  return area;
}

/** Resposta pública: nunca inclui IDs, docs Payload ou stack. */
function assertPublicSuccessBody(body: { ok: true; message: string }): {
  ok: true;
  message: string;
} {
  return { ok: true, message: body.message };
}

function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return toNumericId((value as { id: unknown }).id);
  }
  return null;
}

async function resolveOrganizationId(
  req: PayloadRequest,
  organizationInteresse: string | null,
): Promise<number | null> {
  if (!organizationInteresse) {
    return null;
  }

  const byId = /^\d+$/.test(organizationInteresse)
    ? await req.payload
        .findByID({
          collection: 'organizations',
          id: Number(organizationInteresse),
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null)
    : null;

  if (byId && byId.active !== false) {
    return toNumericId(byId.id);
  }

  const bySlug = await req.payload.find({
    collection: 'organizations',
    where: {
      and: [
        { active: { equals: true } },
        {
          or: [
            { slug: { equals: organizationInteresse } },
            { name: { equals: organizationInteresse } },
          ],
        },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  return toNumericId(bySlug.docs[0]?.id);
}

async function findOrCreateCrmCompany(
  req: PayloadRequest,
  data: NormalizedLeadCapture,
): Promise<number | null> {
  if (!data.empresa) {
    return null;
  }

  const normalized = normalizeCompanyName(data.empresa);
  const existing = await req.payload.find({
    collection: 'crm-companies',
    where: {
      or: [{ tradeName: { contains: data.empresa } }, { legalName: { contains: data.empresa } }],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  const match = existing.docs.find((doc) => {
    const trade = typeof doc.tradeName === 'string' ? normalizeCompanyName(doc.tradeName) : '';
    const legal = typeof doc.legalName === 'string' ? normalizeCompanyName(doc.legalName) : '';
    return trade === normalized || legal === normalized;
  });

  if (match) {
    return toNumericId(match.id);
  }

  const created = await req.payload.create({
    collection: 'crm-companies',
    data: {
      legalName: data.empresa,
      tradeName: data.empresa,
      city: data.cidade ?? undefined,
      state: data.estado ?? undefined,
      status: 'prospect',
      notes: 'Criada automaticamente via landing page /interesse.',
      tags: ['landing_page'],
    },
    overrideAccess: true,
    req,
  });

  return toNumericId(created.id);
}

async function findOrUpsertContact(
  req: PayloadRequest,
  data: NormalizedLeadCapture,
  companyId: number | null,
): Promise<number> {
  const byEmail = await req.payload.find({
    collection: 'contacts',
    where: { email: { equals: data.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  let contact = byEmail.docs[0] ?? null;

  if (!contact) {
    const byWhatsapp = await req.payload.find({
      collection: 'contacts',
      where: { whatsapp: { equals: data.whatsapp } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    contact = byWhatsapp.docs[0] ?? null;
  }

  const consentNote = buildConsentNote(data);
  const notesParts = [consentNote];
  if (data.mensagem) {
    notesParts.push(`Mensagem: ${data.mensagem}`);
  }

  if (contact) {
    const prevNotes = typeof contact.notes === 'string' ? contact.notes : '';
    const existingCompanyId = toNumericId(contact.company);
    const updated = await req.payload.update({
      collection: 'contacts',
      id: contact.id,
      data: {
        name: data.nome,
        email: data.email,
        whatsapp: data.whatsapp,
        phone: data.whatsapp,
        jobTitle: data.cargo ?? contact.jobTitle ?? undefined,
        company: companyId ?? existingCompanyId ?? undefined,
        origin: 'landing_page',
        notes: [prevNotes, ...notesParts].filter(Boolean).join('\n\n').slice(0, 4000),
      },
      overrideAccess: true,
      req,
    });
    const id = toNumericId(updated.id);
    if (id == null) {
      throw new Error('contact_update_missing_id');
    }
    return id;
  }

  const created = await req.payload.create({
    collection: 'contacts',
    data: {
      name: data.nome,
      email: data.email,
      whatsapp: data.whatsapp,
      phone: data.whatsapp,
      jobTitle: data.cargo ?? undefined,
      company: companyId ?? undefined,
      origin: 'landing_page',
      notes: notesParts.join('\n\n'),
    },
    overrideAccess: true,
    req,
  });

  const id = toNumericId(created.id);
  if (id == null) {
    throw new Error('contact_create_missing_id');
  }
  return id;
}

/**
 * Captação pública de interesse comercial → Contact / CRM Company / Lead / Activity.
 * Não cria User.
 */
export const leadCaptureEndpoint: Endpoint = {
  path: '/omnia/lead-capture',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const origin = req.headers.get('origin');
      const trusted = trustedOrigins();
      // Permite same-origin admin e origins confiáveis do portal; bloqueia Origin arbitrária.
      if (origin && !isTrustedOrigin(origin, trusted)) {
        req.payload.logger.warn({ msg: 'lead-capture: origin rejected', origin });
        return errorResponse(403, 'FORBIDDEN', 'Origem não autorizada.');
      }

      const raw = typeof req.json === 'function' ? await req.json().catch(() => null) : null;
      if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return errorResponse(400, 'BAD_REQUEST', 'Corpo da requisição inválido.');
      }

      const rawText = JSON.stringify(raw);
      if (isBodyTooLarge(rawText)) {
        return errorResponse(400, 'BAD_REQUEST', 'Payload excessivo.');
      }

      const body = raw as Record<string, unknown>;

      if (isHoneypotTriggered(body)) {
        req.payload.logger.info({ msg: 'lead-capture: honeypot triggered' });
        return successResponse(false);
      }

      const validated = validateLeadCaptureBody(body);
      if (!validated.ok) {
        return errorResponse(
          validated.status,
          validated.status === 422 ? 'UNPROCESSABLE' : 'BAD_REQUEST',
          validated.error,
        );
      }

      const data = validated.data;
      const ip = clientIpFromHeaders(req.headers);
      const rate = await allowLeadCaptureRequest({
        ip,
        email: data.email,
        whatsapp: data.whatsapp,
      });

      if (!rate.allowed) {
        req.payload.logger.warn({
          msg: 'lead-capture: rate limited',
          code: 'RATE_LIMITED',
          reason: rate.reason,
        });
        return errorResponse(
          rate.reason === 'redis_unavailable' ? 503 : 429,
          rate.reason === 'redis_unavailable' ? 'INTERNAL_ERROR' : 'RATE_LIMITED',
          rate.reason === 'redis_unavailable'
            ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
            : 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        );
      }

      const organizationId = await resolveOrganizationId(req, data.organizationInteresse);
      if (data.organizationInteresse && !organizationId) {
        return errorResponse(422, 'UNPROCESSABLE', 'Organização de interesse inválida.');
      }

      const companyId = await findOrCreateCrmCompany(req, data);
      const contactId = await findOrUpsertContact(req, data, companyId);

      const recent = await req.payload.find({
        collection: 'leads',
        where: {
          and: [
            { contact: { equals: contactId } },
            { origin: { equals: 'landing_page' } },
            { interest: { equals: data.areaInteresse } },
          ],
        },
        sort: '-createdAt',
        limit: 5,
        depth: 0,
        overrideAccess: true,
      });

      const duplicate = recent.docs.find(
        (lead) =>
          isWithinDedupeWindow(String(lead.createdAt)) &&
          sameCampaignAndInterest(
            {
              interest: typeof lead.interest === 'string' ? lead.interest : null,
              notes: typeof lead.notes === 'string' ? lead.notes : null,
              origin: typeof lead.origin === 'string' ? lead.origin : null,
            },
            data,
          ),
      );

      if (duplicate) {
        await req.payload.update({
          collection: 'leads',
          id: duplicate.id,
          data: {
            notes: [
              typeof duplicate.notes === 'string' ? duplicate.notes : '',
              buildLeadNotes(data),
            ]
              .filter(Boolean)
              .join('\n\n')
              .slice(0, 4000),
          },
          overrideAccess: true,
          context: { skipLeadActivityLog: true },
          req,
        });

        await req.payload.create({
          collection: 'activities',
          data: {
            type: 'lead_captured' as 'create' | 'update' | 'status_change' | 'comment',
            message: `Recaptura consolidada (janela 15 min) · interesse=${interestLabel(data.areaInteresse)} · actor=system/public-form`,
            relatedTo: { relationTo: 'leads', value: duplicate.id },
            author: null,
          },
          overrideAccess: true,
          req,
        });

        req.payload.logger.info({
          msg: 'lead-capture: deduped',
          code: 'DEDUPE_WINDOW',
        });
        return successResponse(true);
      }

      await req.payload.create({
        collection: 'leads',
        data: {
          name: data.nome,
          companyName: data.empresa ?? undefined,
          company: companyId ?? undefined,
          contact: contactId,
          origin: 'landing_page',
          interest: data.areaInteresse,
          groupOrganization: organizationId ?? undefined,
          status: 'novo',
          temperature: 'frio',
          notes: buildLeadNotes(data),
        },
        overrideAccess: true,
        req,
      });

      req.payload.logger.info({ msg: 'lead-capture: accepted', code: 'CREATED' });
      return successResponse(false);
    } catch (error) {
      req.payload.logger.error({
        msg: 'lead-capture: internal error',
        code: 'INTERNAL_ERROR',
        err: error instanceof Error ? error.message : 'unknown',
      });
      return errorResponse(
        503,
        'INTERNAL_ERROR',
        'Não foi possível registrar seu interesse agora. Tente novamente em instantes.',
      );
    }
  },
};
