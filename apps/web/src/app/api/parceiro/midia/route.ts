import { NextResponse } from 'next/server';

import {
  MARKETPLACE_PDF_UPLOAD_DISABLED_MESSAGE,
  MARKETPLACE_UPLOAD_MAX_BODY_BYTES,
  isMarketplacePdfUploadEnabled,
} from '@omnia/shared';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';
import { getPublicSiteOrigin } from '@/lib/seo/site-url';

export const dynamic = 'force-dynamic';

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Upload de imagem/ficha técnica do painel do parceiro. Repassa ao Admin com o JWT da sessão;
 * autorização, tipo real do arquivo e limites são validados no Admin.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== getPublicSiteOrigin()) {
    return json(403, { ok: false, message: 'Origem não autorizada.' });
  }
  const length = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(length) || length <= 0 || length > MARKETPLACE_UPLOAD_MAX_BODY_BYTES) {
    return json(413, {
      ok: false,
      message: 'Arquivo acima do limite (imagem até 5 MB, PDF até 10 MB).',
    });
  }
  const token = await getSessionToken();
  if (!token) return json(401, { ok: false, message: 'Sua sessão expirou. Entre novamente.' });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!form || !(file instanceof File) || file.size === 0) {
    return json(422, { ok: false, message: 'Selecione um arquivo.' });
  }
  const kind = String(form.get('kind') ?? '');
  const slot = String(form.get('slot') ?? '');
  const listingId = String(form.get('listingId') ?? '');
  if (
    !['product', 'service'].includes(kind) ||
    !['image', 'datasheet'].includes(slot) ||
    !/^\d{1,12}$/.test(listingId)
  ) {
    return json(422, { ok: false, message: 'Dados do envio inválidos.' });
  }
  if (slot === 'datasheet' && !isMarketplacePdfUploadEnabled()) {
    return json(403, { ok: false, message: MARKETPLACE_PDF_UPLOAD_DISABLED_MESSAGE });
  }

  const upstream = new FormData();
  upstream.set('file', file, file.name || 'arquivo');
  upstream.set(
    '_payload',
    JSON.stringify({ kind, slot, listingId, alt: String(form.get('alt') ?? '').slice(0, 160) }),
  );

  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/omnia/marketplace-listing-media`, {
      method: 'POST',
      headers: { Authorization: `JWT ${token}` },
      body: upstream,
      cache: 'no-store',
    });
    const body = ((await response.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    return json(response.status, {
      ok: response.ok,
      message:
        typeof body.message === 'string'
          ? body.message
          : response.ok
            ? 'Enviado.'
            : 'Não foi possível enviar.',
    });
  } catch {
    return json(503, {
      ok: false,
      message: 'Serviço temporariamente indisponível. Tente novamente.',
    });
  }
}
