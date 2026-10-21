/**
 * Origins permitidos para CORS / lead-capture.
 * Produção: portal apex + www + admin. Localhost só fora de production.
 */

/** Domínios do Portal da holding: cada um aceita também a variante www (e vice-versa). */
const PORTAL_APEX_DOMAINS = ['omniafrigo.com.br', 'omniafrigoholding.com.br'];

/**
 * `OMNIA_EXTRA_TRUSTED_ORIGINS` (separados por vírgula): origens adicionais para janelas de
 * transição de domínio. Só origem pura (sem caminho); em production, só https.
 */
function parseExtraOrigins(raw: string | undefined, production: boolean): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const item of raw.split(',')) {
    const value = item.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.origin !== value.replace(/\/$/, '')) continue;
      if (production && url.protocol !== 'https:') continue;
      out.push(url.origin);
    } catch {
      // ignora URL inválida
    }
  }
  return out;
}

export function getAllowedCorsOrigins(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const fromEnv = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_PORTAL_URL,
    env.NEXT_PUBLIC_ADMIN_URL,
    env.PAYLOAD_PUBLIC_SERVER_URL,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  const extras: string[] = [];
  for (const entry of fromEnv) {
    try {
      const url = new URL(entry);
      for (const apex of PORTAL_APEX_DOMAINS) {
        if (url.hostname === apex) {
          extras.push(`${url.protocol}//www.${apex}`);
        }
        if (url.hostname === `www.${apex}`) {
          extras.push(`${url.protocol}//${apex}`);
        }
      }
    } catch {
      // ignora URL inválida
    }
  }

  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const local = production ? [] : ['http://localhost:3000', 'http://localhost:3001'];
  const transition = parseExtraOrigins(env.OMNIA_EXTRA_TRUSTED_ORIGINS, production);

  const fallback = fromEnv.length === 0 ? ['http://localhost:3000', 'http://localhost:3001'] : [];

  return [...new Set([...fromEnv, ...extras, ...transition, ...local, ...fallback])];
}
