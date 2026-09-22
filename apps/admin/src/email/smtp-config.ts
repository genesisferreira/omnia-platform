/**
 * Parsing e validação de SMTP para o adapter Payload (Mailpit / Titan).
 * Não registra senhas nem objetos auth em logs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RESET_PASSWORD_PATH } from './auth-messages';

export type SmtpFrom = {
  name: string;
  address: string;
};

export type SmtpTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
};

export type ResolvedSmtpConfig = {
  from: SmtpFrom;
  transport: SmtpTransportConfig;
  serverURL: string;
  resetPasswordPath: string;
};

export { FORGOT_PASSWORD_NEUTRAL_MESSAGE, RESET_PASSWORD_PATH } from './auth-messages';

const LOCAL_SMTP_HOSTS = new Set(['localhost', '127.0.0.1', 'mailpit', '::1']);

/**
 * Carrega `.env` da raiz do monorepo sem sobrescrever variáveis já definidas.
 * Não registra valores.
 */
export function loadRootEnvFile(): void {
  // Build Docker / simulação de importmap: não injetar .env do host.
  if (process.env.DOCKER_BUILD === 'true' || process.env.OMNIA_SKIP_ROOT_ENV === '1') {
    return;
  }
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rootEnvPath = path.resolve(here, '../../../../.env');
    if (!fs.existsSync(rootEnvPath)) {
      return;
    }
    const text = fs.readFileSync(rootEnvPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (!key) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Não sobrescreve env já definido no processo, exceto chaves SMTP_*
      // do arquivo (última ocorrência vence — permite bloco Titan após Mailpit).
      const isSmtpKey = key.startsWith('SMTP_');
      if (!isSmtpKey && process.env[key] !== undefined) {
        continue;
      }
      if (isSmtpKey && process.env[key] !== undefined && !value) {
        continue;
      }
      process.env[key] = value;
    }
  } catch {
    // resolveSmtpConfig falha com mensagem clara se faltar configuração.
  }
}

export function parseSmtpFrom(raw: string | undefined): SmtpFrom {
  const value = (raw || '').trim();
  if (!value) {
    throw new Error('SMTP_FROM é obrigatório.');
  }

  const angled = value.match(/^"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (angled?.[1] !== undefined && angled[2]) {
    const name = angled[1].trim() || 'Omnia Platform';
    const address = angled[2].trim();
    if (!address.includes('@')) {
      throw new Error('SMTP_FROM inválido: endereço de e-mail ausente.');
    }
    return { name, address };
  }

  if (!value.includes('@')) {
    throw new Error('SMTP_FROM inválido: informe um e-mail ou "Nome <email>".');
  }

  return { name: 'Omnia Platform', address: value };
}

export function parseSmtpSecure(raw: string | undefined, port: number): boolean {
  if (typeof raw === 'string' && raw.trim() !== '') {
    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    throw new Error('SMTP_SECURE inválido: use true ou false.');
  }

  // Porta 465 = TLS implícito; 587 = STARTTLS (secure=false).
  return port === 465;
}

export function parseSmtpPort(raw: string | undefined): number {
  const value = (raw || '').trim();
  if (!value) {
    throw new Error('SMTP_PORT é obrigatório.');
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT inválido.');
  }
  return port;
}

export function isLocalSmtpHost(host: string): boolean {
  return LOCAL_SMTP_HOSTS.has(host.trim().toLowerCase());
}

export function resolveAdminServerURL(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = (env.NEXT_PUBLIC_ADMIN_URL || '').trim().replace(/\/$/, '');
  if (!raw) {
    throw new Error('NEXT_PUBLIC_ADMIN_URL é obrigatório para links de e-mail.');
  }
  return raw;
}

export function buildResetPasswordURL(serverURL: string, token: string): string {
  const base = serverURL.replace(/\/$/, '');
  const encoded = encodeURIComponent(token);
  return `${base}${RESET_PASSWORD_PATH}?token=${encoded}`;
}

export type ResolveSmtpOptions = {
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
};

/**
 * Ferramentas de build/codegen (importmap, next build, docker build).
 * Não implica liberar SMTP inválido em runtime.
 */
export function isBuildToolingPhase(
  env: Record<string, string | undefined> = process.env,
  argv: readonly string[] = process.argv,
): boolean {
  if (env.OMNIA_SMTP_ALLOW_BUILD === '1') {
    return true;
  }
  if (env.CI === 'true') {
    return true;
  }
  if (env.DOCKER_BUILD === 'true') {
    return true;
  }
  if (env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }
  const lifecycle = env.npm_lifecycle_event || '';
  if (
    lifecycle === 'build' ||
    lifecycle === 'generate:importmap' ||
    lifecycle === 'migrate' ||
    lifecycle === 'migrate:status'
  ) {
    return true;
  }
  return argv.some((arg) => {
    const value = String(arg);
    return (
      value.includes('generate:importmap') ||
      value === 'migrate' ||
      value === 'migrate:status' ||
      value.endsWith('/migrate')
    );
  });
}

/** @deprecated Use isBuildToolingPhase — mantido para testes existentes. */
export function isCompileOrBuildPhase(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isBuildToolingPhase(env);
}

/**
 * Adia a resolução SMTP quando NÃO há SMTP_HOST e estamos em tooling de build.
 * Com SMTP_HOST presente (runtime Docker), nunca adia — evita inlining de build.
 * Sem SMTP_HOST e fora de tooling → não adia (resolveSmtpConfig falha ao subir).
 */
export function isSmtpConfigDeferred(
  env: Record<string, string | undefined> = process.env,
  argv: readonly string[] = process.argv,
): boolean {
  const hasHost = Boolean((env.SMTP_HOST || '').trim());
  if (hasHost) {
    return false;
  }
  return isBuildToolingPhase(env, argv);
}

/**
 * Resolve configuração SMTP.
 * - development: Mailpit sem auth; Titan quando USER+PASS presentes.
 * - staging/production (runtime): exige SMTP completo; rejeita localhost.
 * - next build: não aplica o gate de produção (NODE_ENV=production no build).
 */
export function resolveSmtpConfig(options: ResolveSmtpOptions = {}): ResolvedSmtpConfig {
  const env = options.env ?? process.env;
  const nodeEnv = options.nodeEnv ?? env.NODE_ENV ?? 'development';
  const buildPhase = isBuildToolingPhase(env);
  const isProdLike = (nodeEnv === 'production' || nodeEnv === 'staging') && !buildPhase;

  const host = (env.SMTP_HOST || '').trim();
  if (!host) {
    throw new Error('SMTP_HOST é obrigatório.');
  }

  if (isProdLike && isLocalSmtpHost(host)) {
    throw new Error('SMTP_HOST não pode ser localhost em staging/produção.');
  }

  const port = parseSmtpPort(env.SMTP_PORT);
  const secure = parseSmtpSecure(env.SMTP_SECURE, port);
  const from = parseSmtpFrom(env.SMTP_FROM);
  const serverURL = resolveAdminServerURL(env);

  if (isProdLike) {
    try {
      const url = new URL(serverURL);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        throw new Error('NEXT_PUBLIC_ADMIN_URL não pode ser localhost em staging/produção.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('localhost')) {
        throw error;
      }
      throw new Error('NEXT_PUBLIC_ADMIN_URL inválido.');
    }
  }

  const user = (env.SMTP_USER || '').trim();
  const pass = env.SMTP_PASS ?? '';

  const transport: SmtpTransportConfig = {
    host,
    port,
    secure,
  };

  if (user && pass) {
    transport.auth = { user, pass };
  } else if (isProdLike) {
    throw new Error('SMTP incompleto: SMTP_USER e SMTP_PASS são obrigatórios em staging/produção.');
  } else if (!isLocalSmtpHost(host)) {
    throw new Error('SMTP_USER e SMTP_PASS são obrigatórios para hosts SMTP remotos (ex.: Titan).');
  }
  // Mailpit / SMTP local sem autenticação permitido em development.

  return {
    from,
    transport,
    serverURL,
    resetPasswordPath: RESET_PASSWORD_PATH,
  };
}

/** Remove campos sensíveis para logs/diagnóstico. */
export function smtpConfigForLog(config: ResolvedSmtpConfig): Record<string, unknown> {
  return {
    host: config.transport.host,
    port: config.transport.port,
    secure: config.transport.secure,
    hasAuth: Boolean(config.transport.auth),
    fromAddress: config.from.address,
    fromName: config.from.name,
    serverURL: config.serverURL,
  };
}
