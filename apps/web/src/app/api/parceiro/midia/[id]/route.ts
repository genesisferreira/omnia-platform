import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

/**
 * Pré-visualização no painel de arquivos ainda privados (anúncio não publicado).
 * A ACL de `partner-listing-media` no Admin decide quem pode ler; aqui só repassamos o JWT.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return new Response('Not found', { status: 404 });
  const token = await getSessionToken();
  if (!token) return new Response('Unauthorized', { status: 401 });

  const admin = getAdminBaseUrl();
  const auth = { Authorization: `JWT ${token}` };
  try {
    const meta = await fetch(`${admin}/api/partner-listing-media/${id}?depth=0`, { headers: auth, cache: 'no-store' });
    if (!meta.ok) return new Response('Not found', { status: 404 });
    const doc = (await meta.json()) as { url?: unknown; mimeType?: unknown };
    let pathname = '';
    try {
      // `url` pode vir absoluta (serverURL); só o caminho é usado e sempre contra o Admin interno.
      pathname = typeof doc.url === 'string' ? new URL(doc.url, 'http://local').pathname : '';
    } catch {
      pathname = '';
    }
    const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : '';
    if (!/^\/api\/partner-listing-media\/file\/mk-[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(pathname) || !ALLOWED_TYPES.has(mimeType)) {
      return new Response('Not found', { status: 404 });
    }
    const file = await fetch(`${admin}${pathname}`, { headers: auth, cache: 'no-store' });
    if (!file.ok || !file.body) return new Response('Not found', { status: 404 });
    return new Response(file.body, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'",
        'Content-Disposition':
          mimeType === 'application/pdf' ? 'attachment; filename="ficha-tecnica.pdf"' : 'inline',
      },
    });
  } catch {
    return new Response('Service unavailable', { status: 503 });
  }
}
