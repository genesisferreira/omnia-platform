/**
 * Device Access Control — contrato compartilhado Web ↔ Admin (Edge-safe, sem node:crypto).
 *
 * Identidade do dispositivo = token opaco emitido pelo servidor (Admin), guardado num cookie
 * persistente HttpOnly. O banco guarda apenas o SHA-256 do token. Nunca IP/User-Agent/fingerprint.
 */

/** Header S2S (Web server → Admin) com o token bruto do dispositivo. Nunca logar. */
export const DEVICE_TOKEN_HEADER = 'x-omnia-device-token';

/** 32 bytes em base64url = 43 caracteres. */
const DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Validade do cookie (o token não expira por tempo; revogação é server-side). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export function isWellFormedDeviceToken(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_TOKEN_PATTERN.test(value);
}

export type DeviceCookieConfig = {
  name: string;
  /** Domínio compartilhado Web/Admin (ex.: `omniafrigo.com.br`); undefined = host-only. */
  domain?: string;
  secure: boolean;
};

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Nome/domínio determinísticos a partir das URLs públicas:
 * - nome inclui o host do portal → cookies de ambientes distintos nunca colidem
 *   (ex.: prod `omniafrigo.com.br` vs DEV `dev.omniafrigo.com.br`);
 * - domínio = host do portal quando o Admin é subdomínio dele (Admin lê o mesmo cookie para
 *   mídia/REST direto); caso contrário host-only.
 * Overrides explícitos por env têm precedência.
 */
export function resolveDeviceCookieConfig(input: {
  appUrl?: string | null;
  adminUrl?: string | null;
  nodeEnv?: string | null;
  nameOverride?: string | null;
  domainOverride?: string | null;
}): DeviceCookieConfig {
  const appHost = hostOf(input.appUrl);
  const adminHost = hostOf(input.adminUrl);
  const suffix = (appHost || 'local').replace(/[^a-z0-9]+/g, '_');
  const name = input.nameOverride?.trim() || `omnia_device_${suffix}`;
  let domain: string | undefined;
  if (input.domainOverride?.trim()) {
    domain = input.domainOverride.trim().replace(/^\./, '');
  } else if (
    appHost &&
    adminHost &&
    appHost !== 'localhost' &&
    /\./.test(appHost) &&
    adminHost.endsWith(`.${appHost}`)
  ) {
    domain = appHost;
  }
  return { name, domain, secure: input.nodeEnv === 'production' };
}

/** Lê um cookie de um header `Cookie` bruto (sem dependências). */
export function readCookieFromHeader(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      const raw = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

/** Estados públicos (seguros para UI) da avaliação de dispositivo. */
export type DeviceAccessState =
  | 'NOT_ENFORCED'
  | 'ALLOWED'
  | 'REGISTRATION_AVAILABLE'
  | 'BLOCKED_LIMIT'
  | 'PENDING_APPROVAL'
  | 'DEVICE_REVOKED';

export const DEVICE_BLOCKING_STATES: readonly DeviceAccessState[] = [
  'REGISTRATION_AVAILABLE',
  'BLOCKED_LIMIT',
  'PENDING_APPROVAL',
  'DEVICE_REVOKED',
];

/** Código de erro das APIs protegidas quando o dispositivo não está autorizado. */
export const DEVICE_NOT_AUTHORIZED_CODE = 'DEVICE_NOT_AUTHORIZED';

/** Rótulo seguro derivado (sem armazenar UA bruto): tipo + família de navegador/SO. */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export function describeDevice(userAgent: string | null | undefined): {
  label: string;
  deviceType: DeviceType;
} {
  const ua = String(userAgent || '');
  const deviceType: DeviceType = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobi|Android|iPhone/i.test(ua)
      ? 'mobile'
      : ua
        ? 'desktop'
        : 'unknown';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navegador';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iOS/i.test(ua)
      ? 'iOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Sistema desconhecido';
  return { label: `${browser} em ${os}`, deviceType };
}
