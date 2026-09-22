import { buildResetPasswordURL, type ResolvedSmtpConfig } from './smtp-config';

type ForgotPasswordEmailArgs = {
  token?: string;
  user?: { email?: string | null; name?: string | null } | null;
};

export function generateForgotPasswordSubject(): string {
  return 'Recuperação de senha — Omnia Platform';
}

export function generateForgotPasswordHTML(
  args: ForgotPasswordEmailArgs,
  smtp: Pick<ResolvedSmtpConfig, 'serverURL'>,
): string {
  const token = typeof args.token === 'string' ? args.token : '';
  if (!token) {
    return '<p>Não foi possível gerar o link de recuperação. Solicite novamente.</p>';
  }

  const resetURL = buildResetPasswordURL(smtp.serverURL, token);
  const greetingName =
    typeof args.user?.name === 'string' && args.user.name.trim()
      ? args.user.name.trim()
      : 'usuário';

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
    <p>Olá, ${escapeHtml(greetingName)}.</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta na Omnia Platform.</p>
    <p>
      <a href="${escapeHtml(resetURL)}" style="color: #0b3d91;">Redefinir senha</a>
    </p>
    <p style="word-break: break-all; font-size: 12px; color: #475569;">${escapeHtml(resetURL)}</p>
    <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
    <p>Omnia Frigo Holding</p>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
