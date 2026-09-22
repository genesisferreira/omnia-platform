import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

import { resolveSmtpConfig, type ResolvedSmtpConfig, type ResolveSmtpOptions } from './smtp-config';

export type BuiltEmailAdapter = {
  smtp: ResolvedSmtpConfig;
  adapter: ReturnType<typeof nodemailerAdapter>;
};

/**
 * Monta o adapter Nodemailer a partir do env validado.
 * Chamar apenas em runtime (nunca no caminho de generate:importmap sem SMTP).
 */
export function buildNodemailerEmailAdapter(options: ResolveSmtpOptions = {}): BuiltEmailAdapter {
  const smtp = resolveSmtpConfig(options);
  const adapter = nodemailerAdapter({
    defaultFromAddress: smtp.from.address,
    defaultFromName: smtp.from.name,
    transportOptions: {
      host: smtp.transport.host,
      port: smtp.transport.port,
      secure: smtp.transport.secure,
      ...(smtp.transport.auth
        ? {
            auth: {
              user: smtp.transport.auth.user,
              pass: smtp.transport.auth.pass,
            },
          }
        : {}),
    },
  });

  return { smtp, adapter };
}
