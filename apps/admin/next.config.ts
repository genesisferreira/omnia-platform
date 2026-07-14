import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' as const } : {}),
  transpilePackages: ['@omnia/ui', '@omnia/database', '@omnia/monitoring'],
  reactStrictMode: true,
};

export default withPayload(nextConfig);
