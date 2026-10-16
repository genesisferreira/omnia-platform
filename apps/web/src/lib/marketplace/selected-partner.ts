export const PARTNER_COOKIE = 'omnia_partner_id';
export const PARTNER_HEADER = 'x-omnia-partner-id';

/**
 * Escolhe o parceiro selecionado. O id vindo de header/cookie é apenas uma dica:
 * só vale se pertencer às associações ativas do usuário (nunca confiar no cliente).
 */
export function pickSelectedMembership<T extends { partner: { id: string } }>(
  memberships: readonly T[],
  hints: ReadonlyArray<string | null | undefined>,
): T | null {
  for (const hint of hints) {
    const id = hint?.trim();
    if (!id) continue;
    const match = memberships.find((entry) => entry.partner.id === id);
    if (match) return match;
  }
  return memberships[0] ?? null;
}
