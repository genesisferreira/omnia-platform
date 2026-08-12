/** CPF/CNPJ — normalização e validação (sem depender de UI). */

export function stripDocumentDigits(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\D/g, '');
}

function allSameDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function cpfCheckDigits(base: string): string {
  const nums = base.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += nums[i]! * (10 - i);
  }
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  sum = 0;
  const withD1 = [...nums.slice(0, 9), d1];
  for (let i = 0; i < 10; i += 1) {
    sum += withD1[i]! * (11 - i);
  }
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return `${d1}${d2}`;
}

function cnpjCheckDigits(base: string): string {
  const nums = base.split('').map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += nums[i]! * w1[i]!;
  }
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  sum = 0;
  const withD1 = [...nums.slice(0, 12), d1];
  for (let i = 0; i < 13; i += 1) {
    sum += withD1[i]! * w2[i]!;
  }
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return `${d1}${d2}`;
}

export type DocumentValidation =
  { ok: true; digits: string; kind: 'cpf' | 'cnpj' } | { ok: false; message: string };

export function validateBrazilianDocument(value: unknown): DocumentValidation {
  const digits = stripDocumentDigits(value);
  if (!digits) {
    return { ok: false, message: 'Informe o CPF ou CNPJ.' };
  }
  if (allSameDigits(digits)) {
    return { ok: false, message: 'CPF/CNPJ inválido.' };
  }
  if (digits.length === 11) {
    if (digits.slice(9) !== cpfCheckDigits(digits.slice(0, 9))) {
      return { ok: false, message: 'CPF inválido.' };
    }
    return { ok: true, digits, kind: 'cpf' };
  }
  if (digits.length === 14) {
    if (digits.slice(12) !== cnpjCheckDigits(digits.slice(0, 12))) {
      return { ok: false, message: 'CNPJ inválido.' };
    }
    return { ok: true, digits, kind: 'cnpj' };
  }
  return {
    ok: false,
    message: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos (somente números).',
  };
}

/** Nunca use na página pública — apenas logs internos se necessário. */
export function maskDocument(digits: string): string {
  if (digits.length === 11) {
    return `***.***.***-${digits.slice(-2)}`;
  }
  if (digits.length === 14) {
    return `**.***.***/****-${digits.slice(-2)}`;
  }
  return '****';
}
