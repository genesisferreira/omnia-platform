/**
 * Resolve embed seguro para vídeo externo (YouTube / Vimeo / URL direta https).
 * Bloqueia javascript:/data: e esquemas não-http(s).
 */

export type ExternalVideoResolved =
  | { ok: true; kind: 'youtube' | 'vimeo' | 'direct'; embedUrl: string; watchUrl: string }
  | {
      ok: false;
      reason: 'missing' | 'insecure' | 'unsupported';
      message: string;
      watchUrl?: string;
    };

export function resolveExternalVideoUrl(raw: string | null | undefined): ExternalVideoResolved {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Vídeo ainda não configurado para esta aula.',
    };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'URL de vídeo inválida.',
    };
  }
  const protocol = url.protocol.toLowerCase();
  if (protocol === 'javascript:' || protocol === 'data:' || protocol === 'file:') {
    return {
      ok: false,
      reason: 'insecure',
      message: 'URL de vídeo não permitida por segurança.',
    };
  }
  if (protocol !== 'https:' && protocol !== 'http:') {
    return {
      ok: false,
      reason: 'insecure',
      message: 'Apenas URLs http(s) são aceitas.',
    };
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (id) {
      return {
        ok: true,
        kind: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        watchUrl: trimmed,
      };
    }
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id =
      url.searchParams.get('v') ||
      (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null) ||
      (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : null);
    if (id) {
      return {
        ok: true,
        kind: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        watchUrl: trimmed,
      };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'player.vimeo.com' ? parts[1] : parts[0];
    if (id && /^\d+$/.test(id)) {
      return {
        ok: true,
        kind: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${id}`,
        watchUrl: trimmed,
      };
    }
  }

  // URL direta de mídia (mp4 etc.) — usar tag video, não iframe genérico
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url.pathname)) {
    return { ok: true, kind: 'direct', embedUrl: trimmed, watchUrl: trimmed };
  }

  return {
    ok: false,
    reason: 'unsupported',
    message:
      'Não foi possível embutir este provedor. Use o link autorizado abaixo para abrir o vídeo.',
    watchUrl: trimmed,
  };
}

export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  try {
    const u = new URL(String(raw || '').trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
