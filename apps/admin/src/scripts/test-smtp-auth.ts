/* eslint-disable no-console -- test harness */
/**
 * Testes unitários de SMTP / recuperação de senha (sem infra externa).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validatePasswordPolicy } from '@omnia/constants';

import {
  generateForgotPasswordHTML,
  generateForgotPasswordSubject,
} from '../email/forgot-password-email';
import {
  FORGOT_PASSWORD_NEUTRAL_MESSAGE,
  buildResetPasswordURL,
  isSmtpConfigDeferred,
  parseSmtpFrom,
  parseSmtpPort,
  parseSmtpSecure,
  resolveSmtpConfig,
  smtpConfigForLog,
} from '../email/smtp-config';

describe('SMTP parsing', () => {
  it('parseia FROM com nome e endereço', () => {
    const from = parseSmtpFrom('Omnia Platform <platform@omniafrigo.com.br>');
    assert.equal(from.name, 'Omnia Platform');
    assert.equal(from.address, 'platform@omniafrigo.com.br');
  });

  it('porta 587 com SMTP_SECURE=false usa STARTTLS (secure=false)', () => {
    assert.equal(parseSmtpPort('587'), 587);
    assert.equal(parseSmtpSecure('false', 587), false);
  });

  it('Mailpit local sem autenticação em development', () => {
    const config = resolveSmtpConfig({
      nodeEnv: 'development',
      env: {
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
        SMTP_FROM: 'noreply@omnia.local',
        NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
      },
    });
    assert.equal(config.transport.host, 'localhost');
    assert.equal(config.transport.port, 1025);
    assert.equal(config.transport.auth, undefined);
  });

  it('Titan com USER e PASS em development', () => {
    const config = resolveSmtpConfig({
      nodeEnv: 'development',
      env: {
        SMTP_HOST: 'smtp.titan.email',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'platform@omniafrigo.com.br',
        SMTP_PASS: 'secret-not-for-logs',
        SMTP_FROM: 'Omnia Platform <platform@omniafrigo.com.br>',
        NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
      },
    });
    assert.equal(config.transport.host, 'smtp.titan.email');
    assert.equal(config.transport.secure, false);
    assert.equal(config.transport.auth?.user, 'platform@omniafrigo.com.br');
    assert.equal(config.transport.auth?.pass, 'secret-not-for-logs');
  });

  it('produção com SMTP incompleto falha com mensagem clara', () => {
    assert.throws(
      () =>
        resolveSmtpConfig({
          nodeEnv: 'production',
          env: {
            SMTP_HOST: 'smtp.titan.email',
            SMTP_PORT: '587',
            SMTP_FROM: 'platform@omniafrigo.com.br',
            NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
          },
        }),
      /SMTP_USER e SMTP_PASS/,
    );
  });

  it('produção rejeita localhost', () => {
    assert.throws(
      () =>
        resolveSmtpConfig({
          nodeEnv: 'production',
          env: {
            SMTP_HOST: 'localhost',
            SMTP_PORT: '1025',
            SMTP_USER: 'a@b.c',
            SMTP_PASS: 'x',
            SMTP_FROM: 'a@b.c',
            NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
          },
        }),
      /localhost/,
    );
  });

  it('fase de build do Next não aplica gate de produção', () => {
    const config = resolveSmtpConfig({
      nodeEnv: 'production',
      env: {
        NEXT_PHASE: 'phase-production-build',
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
        SMTP_FROM: 'noreply@omnia.local',
        NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
      },
    });
    assert.equal(config.transport.host, 'localhost');
    assert.equal(config.transport.auth, undefined);
  });

  it('importmap/build sem SMTP_HOST adia a config', () => {
    assert.equal(
      isSmtpConfigDeferred(
        { DOCKER_BUILD: 'true', NODE_ENV: 'production' },
        ['node', 'payload', 'generate:importmap'],
      ),
      true,
    );
    assert.equal(
      isSmtpConfigDeferred(
        {
          SMTP_HOST: 'smtp.titan.email',
          DOCKER_BUILD: 'true',
          NODE_ENV: 'production',
        },
        ['node', 'payload', 'generate:importmap'],
      ),
      false,
    );
  });

  it('runtime sem SMTP_HOST não adia (falha na resolução)', () => {
    assert.equal(isSmtpConfigDeferred({ NODE_ENV: 'production' }, ['node', 'server.js']), false);
    assert.throws(
      () =>
        resolveSmtpConfig({
          nodeEnv: 'production',
          env: {
            NODE_ENV: 'production',
            NEXT_PUBLIC_ADMIN_URL: 'https://admin.omniafrigo.com.br',
          },
        }),
      /SMTP_HOST/,
    );
  });

  it('smtpConfigForLog não vaza SMTP_PASS', () => {
    const config = resolveSmtpConfig({
      nodeEnv: 'development',
      env: {
        SMTP_HOST: 'smtp.titan.email',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'platform@omniafrigo.com.br',
        SMTP_PASS: 'super-secret-password',
        SMTP_FROM: 'platform@omniafrigo.com.br',
        NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
      },
    });
    const logged = JSON.stringify(smtpConfigForLog(config));
    assert.equal(logged.includes('super-secret-password'), false);
    assert.equal(logged.includes('SMTP_PASS'), false);
    assert.equal((smtpConfigForLog(config) as { hasAuth: boolean }).hasAuth, true);
  });
});

describe('reset password URL e e-mail', () => {
  it('URL de reset usa NEXT_PUBLIC_ADMIN_URL', () => {
    const url = buildResetPasswordURL('https://admin.omniafrigo.com.br', 'tok+en/1');
    assert.equal(
      url,
      'https://admin.omniafrigo.com.br/redefinir-senha?token=tok%2Ben%2F1',
    );
  });

  it('template inclui URL e não expõe token cru em subject', () => {
    const html = generateForgotPasswordHTML(
      { token: 'abc123', user: { name: 'Ana', email: 'ana@example.com' } },
      { serverURL: 'https://admin.omniafrigo.com.br' },
    );
    assert.match(html, /redefinir-senha\?token=abc123/);
    assert.equal(generateForgotPasswordSubject().includes('abc123'), false);
  });

  it('mensagem neutra de recuperação está definida', () => {
    assert.match(FORGOT_PASSWORD_NEUTRAL_MESSAGE, /Se existir uma conta/i);
  });
});

describe('password policy no reset', () => {
  it('senha fora da policy é rejeitada', () => {
    const weak = validatePasswordPolicy('curta');
    assert.equal(weak.ok, false);
  });

  it('senha válida passa na policy', () => {
    const ok = validatePasswordPolicy('SenhaForte1!');
    assert.equal(ok.ok, true);
  });
});

console.log('test-smtp-auth: ok');
