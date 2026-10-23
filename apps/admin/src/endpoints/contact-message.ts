import type { Endpoint, PayloadRequest } from 'payload';

import {
  CONTACT_MESSAGE_LIMITS,
  OMNIA_CONTACT_EMAIL,
  contactSubjectLabel,
  validateContactMessage,
  type ContactMessageInput,
} from '@omnia/shared';
import { checkRateLimit } from '@omnia/shared/rate-limit';

import { getAllowedCorsOrigins } from '../lib/allowed-origins';
import { clientIpFromHeaders, isHoneypotTriggered, isTrustedOrigin } from '../lib/lead-capture';
import { escapeHtml } from '../lib/partner-register';

const CONTACT_RATE_LIMIT_MAX = 5;
const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_EMAIL_TIMEOUT_MS = 15_000;

type ErrorCode = 'BAD_REQUEST' | 'FORBIDDEN' | 'RATE_LIMITED' | 'UNPROCESSABLE' | 'UNAVAILABLE';

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const errorResponse = (
  status: number,
  code: ErrorCode,
  message: string,
  field?: string,
): Response => json(status, { ok: false, error: { code, message, ...(field ? { field } : {}) } });

const successResponse = (): Response =>
  json(200, {
    ok: true,
    message: 'Mensagem enviada. Nossa equipe responderá pelo e-mail informado.',
  });

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

function recipientAccepted(info: unknown): boolean {
  if (info == null || typeof info !== 'object') {
    return true;
  }
  const { accepted, rejected } = info as { accepted?: unknown; rejected?: unknown };
  if (Array.isArray(rejected) && rejected.length > 0) {
    return false;
  }
  return !Array.isArray(accepted) || accepted.length > 0;
}

export function buildContactEmail(data: ContactMessageInput): {
  subject: string;
  text: string;
  html: string;
} {
  const label = contactSubjectLabel(data.assunto);
  const subject = `[Site] ${label} — ${data.nome}`.slice(0, 200);
  const text = [
    'Nova mensagem enviada pela página de contato do site.',
    '',
    `Nome: ${data.nome}`,
    `E-mail: ${data.email}`,
    `Assunto: ${label}`,
    '',
    data.mensagem,
    '',
    '— Responda diretamente a este e-mail para falar com o remetente.',
  ].join('\n');
  const html = `<p>Nova mensagem enviada pela página de contato do site.</p>
<p><strong>Nome:</strong> ${escapeHtml(data.nome)}<br/>
<strong>E-mail:</strong> ${escapeHtml(data.email)}<br/>
<strong>Assunto:</strong> ${escapeHtml(label)}</p>
<p style="white-space:pre-wrap">${escapeHtml(data.mensagem)}</p>
<p style="color:#666">Responda diretamente a este e-mail para falar com o remetente.</p>`;
  return { subject, text, html };
}

/**
 * Formulário público de /contato → e-mail para contato@ via SMTP do Admin.
 * Não grava no banco; logs registram apenas códigos (sem nome, e-mail ou mensagem).
 */
export const contactMessageEndpoint: Endpoint = {
  path: '/omnia/contact-message',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      if (!isTrustedOrigin(req.headers.get('origin'), getAllowedCorsOrigins())) {
        req.payload.logger.warn({ msg: 'contact-message: origin rejected', code: 'FORBIDDEN' });
        return errorResponse(403, 'FORBIDDEN', 'Origem não autorizada.');
      }

      const raw = typeof req.json === 'function' ? await req.json().catch(() => null) : null;
      if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return errorResponse(400, 'BAD_REQUEST', 'Corpo da requisição inválido.');
      }
      if (Buffer.byteLength(JSON.stringify(raw), 'utf8') > CONTACT_MESSAGE_LIMITS.bodyMaxBytes) {
        return errorResponse(400, 'BAD_REQUEST', 'Mensagem excede o tamanho permitido.');
      }

      const body = raw as Record<string, unknown>;
      if (isHoneypotTriggered(body)) {
        req.payload.logger.info({ msg: 'contact-message: honeypot triggered', code: 'HONEYPOT' });
        return successResponse();
      }

      const validated = validateContactMessage(body);
      if (!validated.ok) {
        return errorResponse(422, 'UNPROCESSABLE', validated.error, validated.field);
      }
      const data = validated.data;

      const rate = await checkRateLimit({
        scope: 'contact-message',
        subjects: [
          { value: `ip:${clientIpFromHeaders(req.headers)}` },
          { value: data.email, hash: true },
        ],
        max: CONTACT_RATE_LIMIT_MAX,
        windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
        onRedisUnavailable: 'fail-closed',
      });
      if (!rate.allowed) {
        const redisDown = rate.reason === 'redis_unavailable';
        req.payload.logger.warn({ msg: 'contact-message: rate limited', code: rate.reason });
        return errorResponse(
          redisDown ? 503 : 429,
          redisDown ? 'UNAVAILABLE' : 'RATE_LIMITED',
          redisDown
            ? 'Serviço temporariamente indisponível. Use o WhatsApp ou tente novamente em instantes.'
            : 'Muitas mensagens em pouco tempo. Aguarde alguns minutos ou fale pelo WhatsApp.',
        );
      }

      const email = buildContactEmail(data);
      const info = await withTimeout(
        req.payload.sendEmail({
          to: OMNIA_CONTACT_EMAIL,
          replyTo: data.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        }),
        CONTACT_EMAIL_TIMEOUT_MS,
        'email_timeout',
      );
      if (!recipientAccepted(info)) {
        throw new Error('recipient_rejected');
      }

      req.payload.logger.info({ msg: 'contact-message: sent', code: 'SENT' });
      return successResponse();
    } catch (error) {
      req.payload.logger.error({
        msg: 'contact-message: send failed',
        code: 'UNAVAILABLE',
        err: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
      });
      return errorResponse(
        503,
        'UNAVAILABLE',
        'Não foi possível enviar sua mensagem agora. Fale conosco pelo WhatsApp ou por e-mail.',
      );
    }
  },
};
