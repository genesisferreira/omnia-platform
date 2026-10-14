import type { MetadataRoute } from 'next';

import { getPublicSiteOrigin } from '@/lib/seo';
import { buildRobotsDocument } from '@/lib/seo/robots-policy';

export default function robots(): MetadataRoute.Robots {
  return buildRobotsDocument(getPublicSiteOrigin());
}
