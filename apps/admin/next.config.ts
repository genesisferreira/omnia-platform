import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@omnia/ui', '@omnia/database', '@omnia/monitoring'],
  reactStrictMode: true,
};

export default withPayload(nextConfig);
