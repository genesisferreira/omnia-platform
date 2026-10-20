export const PUBLIC_POST_TYPES = ['blog', 'article', 'news'] as const;
export type PublicPostType = (typeof PUBLIC_POST_TYPES)[number];

export const PUBLIC_POST_MAX_RELATED = 6;
export const PUBLIC_POST_DEFAULT_PAGE_SIZE = 10;
export const PUBLIC_POST_MAX_PAGE_SIZE = 20;
export const PUBLIC_POST_MAX_CONTENT_NODES = 500;
export const PUBLIC_POST_SEARCH_MAX_LENGTH = 80;
