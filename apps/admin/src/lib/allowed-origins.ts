/**
 * Origins permitidos para CORS / lead-capture.
 * Produção: portal apex + www + admin. Localhost só fora de production.
 */
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
      if (url.hostname === 'omniafrigo.com.br') {
        extras.push(`${url.protocol}//www.omniafrigo.com.br`);
      }
      if (url.hostname === 'www.omniafrigo.com.br') {
        extras.push(`${url.protocol}//omniafrigo.com.br`);
      }
    } catch {
      // ignora URL inválida
    }
  }

  const nodeEnv = env.NODE_ENV || 'development';
  const local =
    nodeEnv === 'production'
      ? []
      : ['http://localhost:3000', 'http://localhost:3001'];

  const fallback =
    fromEnv.length === 0
      ? ['http://localhost:3000', 'http://localhost:3001']
      : [];

  return [...new Set([...fromEnv, ...extras, ...local, ...fallback])];
}
