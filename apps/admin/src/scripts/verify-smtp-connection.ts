/* eslint-disable no-console -- harness de verificação SMTP */
/**
 * Verifica autenticação SMTP sem imprimir senha nem enviar e-mail.
 * Uso: tsx src/scripts/verify-smtp-connection.ts
 */
import nodemailer from 'nodemailer';

import { loadRootEnvFile, resolveSmtpConfig, smtpConfigForLog } from '../email/smtp-config';

loadRootEnvFile();

const smtp = resolveSmtpConfig({ nodeEnv: 'development' });
console.log('SMTP config (sem secrets):', JSON.stringify(smtpConfigForLog(smtp)));

const transport = nodemailer.createTransport({
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
});

try {
  await transport.verify();
  console.log('SMTP verify: OK (autenticação/aceite do servidor)');
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : 'falha desconhecida';
  const safe = message.replace(/pass(?:word)?[=:].*/gi, 'pass=<redacted>');
  console.error('SMTP verify: FALHOU —', safe);
  process.exit(1);
}
