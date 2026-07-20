export function getAdminBaseUrl(): string {
  const internal = process.env.INTERNAL_ADMIN_URL?.trim();
  if (internal) {
    return internal.replace(/\/+$/, '');
  }

  const publicUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || 'http://localhost:3001';
  return publicUrl.replace(/\/+$/, '');
}

export function getPublicAdminUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || 'http://localhost:3001';
  return publicUrl.replace(/\/+$/, '');
}

export function getAdminLoginUrl(nextPath?: string): string {
  const base = getPublicAdminUrl();
  if (!nextPath) {
    return `${base}/login`;
  }

  return `${base}/login?next=${encodeURIComponent(nextPath)}`;
}
