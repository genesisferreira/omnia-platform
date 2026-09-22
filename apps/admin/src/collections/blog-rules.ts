/**
 * Regras puras de slug do Blog — testáveis sem DB.
 */

export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeBlogSlug = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized === '' ? undefined : normalized;
};

export const isValidBlogSlug = (value: string): boolean => BLOG_SLUG_PATTERN.test(value);

export const PUBLIC_POST_TYPES = ['blog', 'article', 'news'] as const;
export type PublicPostType = (typeof PUBLIC_POST_TYPES)[number];

export const isPublicPostType = (value: unknown): value is PublicPostType =>
  typeof value === 'string' && (PUBLIC_POST_TYPES as readonly string[]).includes(value);
