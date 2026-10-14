import type { MetadataRoute } from 'next';

/** Host administrativo não entra em índice público. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
