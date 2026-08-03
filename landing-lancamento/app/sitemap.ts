import type { MetadataRoute } from 'next'
import { CANONICAL_URL } from '@/lib/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: CANONICAL_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
