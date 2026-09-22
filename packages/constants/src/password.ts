/**
 * Política única de senha da plataforma Omnia.
 * Aplicar em cadastro, troca, reset e criação administrativa.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyResult = { ok: true } | { ok: false; error: string };

const SPECIAL_CHAR = /[^A-Za-z0-9]/;

/**
 * Valida senha sem expor detalhes internos além da regra pública.
 */
export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Informe uma senha válida.' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      error: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: 'A senha deve conter ao menos uma letra maiúscula.' };
  }

  if (!/[a-z]/.test(password)) {
    return { ok: false, error: 'A senha deve conter ao menos uma letra minúscula.' };
  }

  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'A senha deve conter ao menos um número.' };
  }

  if (!SPECIAL_CHAR.test(password)) {
    return { ok: false, error: 'A senha deve conter ao menos um caractere especial.' };
  }

  return { ok: true };
}

export const PASSWORD_POLICY_HINT =
  'Mínimo 10 caracteres, com maiúscula, minúscula, número e caractere especial.';
