/**
 * Alt text público consistente.
 * Preferência: alt editorial → fallback semântico → string vazia (decorativo).
 */
export function resolvePublicImageAlt(alt: string | null | undefined, fallback: string): string {
  if (typeof alt === 'string') {
    const trimmed = alt.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  const fallbackTrimmed = fallback.trim();
  return fallbackTrimmed;
}
